package cloud.computing.encryptionservice.service

import cloud.computing.encryption.Encryption
import cloud.computing.encryption.EncryptionServiceGrpcKt
import cloud.computing.encryptionservice.manager.EncryptionManager
import net.devh.boot.grpc.server.service.GrpcService
import org.springframework.beans.factory.annotation.Autowired

@GrpcService
class EncryptionService(
    @Autowired val encryptionManager: EncryptionManager,
) : EncryptionServiceGrpcKt.EncryptionServiceCoroutineImplBase() {

    override suspend fun encrypt(request: Encryption.EncryptDataRequest): Encryption.EncryptDataResponse {
        return Encryption.EncryptDataResponse.newBuilder().setCiphertext(encryptionManager.encrypt(request.plaintext, request.contextMap, request.keyIdsList)).build()
    }

    override suspend fun decrypt(request: Encryption.DecryptDataRequest): Encryption.DecryptDataResponse {
        return Encryption.DecryptDataResponse.newBuilder().setPlaintext(encryptionManager.decrypt(request.ciphertext, request.contextMap)).build()
    }
}
