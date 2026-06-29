# ---- Build stage ----
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Dependencies first, as their own cached layer -- rebuilding only changes when pom.xml does,
# not on every source-code change.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw clean package -DskipTests -B

# ---- Runtime stage ----
FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

# Don't run as root in the container.
RUN groupadd -r reframe && useradd -r -g reframe reframe

COPY --from=build /app/target/*.jar app.jar
RUN chown reframe:reframe app.jar
USER reframe

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
