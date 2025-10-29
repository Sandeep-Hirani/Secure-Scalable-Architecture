package cloud.computing.encryptionservice.manager

import com.amazonaws.auth.AWSCredentialsProvider
import com.amazonaws.auth.DefaultAWSCredentialsProviderChain
import com.amazonaws.services.kms.AWSKMS
import com.amazonaws.services.kms.AWSKMSClientBuilder
import com.amazonaws.services.kms.model.DecryptRequest
import com.amazonaws.services.kms.model.EncryptRequest
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Handles encryption and decryption requests.
 * Falls back to a local AES-GCM implementation when an AWS KMS key is not provided.
 */
@Component
class EncryptionManager(
    @Value("\${encryption.region:us-east-1}") private val region: String,
    @Value("\${encryption.kms-key-id:}") private val kmsKeyId: String,
    @Value("\${encryption.local-key:}") private val localKey: String,
) {
    private val credentialsProvider: AWSCredentialsProvider = DefaultAWSCredentialsProviderChain()

    private val kmsClient: AWSKMS? = if (kmsKeyId.isNotBlank()) {
        AWSKMSClientBuilder.standard()
            .withRegion(region)
            .withCredentials(credentialsProvider)
            .build()
    } else {
        null
    }

    private val localCipher: LocalEncryptionCipher? = if (localKey.isNotBlank()) {
        LocalEncryptionCipher(localKey)
    } else {
        null
    }

    init {
        require(kmsClient != null || localCipher != null) {
            "Configure either encryption.kms-key-id (with AWS credentials) or encryption.local-key"
        }
    }

    fun encrypt(plaintext: String, contextMap: Map<String, String>, keyIds: List<String>): String {
        kmsClient?.let { client ->
            val request = EncryptRequest()
                .withKeyId(resolveKeyId(keyIds))
                .withPlaintext(ByteBuffer.wrap(plaintext.toByteArray(StandardCharsets.UTF_8)))

            if (contextMap.isNotEmpty()) {
                request.withEncryptionContext(contextMap)
            }

            val result = client.encrypt(request)
            return Base64.getEncoder().encodeToString(result.ciphertextBlob.toByteArray())
        }

        return localCipher?.encrypt(plaintext, contextMap)
            ?: throw IllegalStateException("No encryption backend configured")
    }

    fun decrypt(ciphertext: String, contextMap: Map<String, String>): String {
        kmsClient?.let { client ->
            val request = DecryptRequest()
                .withCiphertextBlob(ByteBuffer.wrap(Base64.getDecoder().decode(ciphertext)))

            if (contextMap.isNotEmpty()) {
                request.withEncryptionContext(contextMap)
            }

            val result = client.decrypt(request)
            return String(result.plaintext.toByteArray(), StandardCharsets.UTF_8)
        }

        return localCipher?.decrypt(ciphertext, contextMap)
            ?: throw IllegalStateException("No encryption backend configured")
    }

    private fun resolveKeyId(explicitKeyIds: List<String>): String {
        explicitKeyIds.firstOrNull { it.isNotBlank() }?.let { return it }
        check(kmsKeyId.isNotBlank()) { "No KMS key id provided" }
        return kmsKeyId
    }
}

private class LocalEncryptionCipher(encodedKey: String) {
    private val secureRandom = SecureRandom()
    private val keyBytes = Base64.getDecoder().decode(encodedKey)
    private val keySpec = SecretKeySpec(keyBytes, "AES")

    init {
        require(keyBytes.size == 16 || keyBytes.size == 24 || keyBytes.size == 32) {
            "encryption.local-key must decode to a 128, 192, or 256 bit key"
        }
    }

    fun encrypt(plaintext: String, context: Map<String, String>): String {
        val iv = ByteArray(12).also(secureRandom::nextBytes)
        val cipher = Cipher.getInstance(ALGORITHM)
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, GCMParameterSpec(GCM_TAG_BITS, iv))
        addContext(cipher, context)

        val ciphertext = cipher.doFinal(plaintext.toByteArray(StandardCharsets.UTF_8))
        return Base64.getEncoder().encodeToString(iv + ciphertext)
    }

    fun decrypt(ciphertext: String, context: Map<String, String>): String {
        val payload = Base64.getDecoder().decode(ciphertext)
        require(payload.size > IV_SIZE_BYTES) { "Ciphertext payload is too short" }

        val iv = payload.copyOfRange(0, IV_SIZE_BYTES)
        val body = payload.copyOfRange(IV_SIZE_BYTES, payload.size)

        val cipher = Cipher.getInstance(ALGORITHM)
        cipher.init(Cipher.DECRYPT_MODE, keySpec, GCMParameterSpec(GCM_TAG_BITS, iv))
        addContext(cipher, context)

        val plaintext = cipher.doFinal(body)
        return plaintext.toString(StandardCharsets.UTF_8)
    }

    private fun addContext(cipher: Cipher, context: Map<String, String>) {
        if (context.isEmpty()) {
            return
        }

        val aad = context.entries
            .sortedBy { it.key }
            .joinToString("&") { "${it.key}=${it.value}" }
            .toByteArray(StandardCharsets.UTF_8)

        cipher.updateAAD(aad)
    }

    companion object {
        private const val ALGORITHM = "AES/GCM/NoPadding"
        private const val IV_SIZE_BYTES = 12
        private const val GCM_TAG_BITS = 128
    }
}

private fun ByteBuffer.toByteArray(): ByteArray {
    val duplicate = this.asReadOnlyBuffer()
    val bytes = ByteArray(duplicate.remaining())
    duplicate.get(bytes)
    return bytes
}
