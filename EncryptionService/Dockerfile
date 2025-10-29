FROM openjdk:23-oracle
EXPOSE 9090
ADD /build/libs/EncryptionService-0.0.1-SNAPSHOT.jar encryption.jar
ENTRYPOINT ["java", "-jar", "encryption.jar"]