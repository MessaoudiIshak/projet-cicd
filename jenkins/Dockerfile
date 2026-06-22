FROM jenkins/jenkins:lts-jdk17
USER root
RUN apt-get update -qq && \
    apt-get install -y -q ca-certificates curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
        > /etc/apt/sources.list.d/docker.list && \
    apt-get update -qq && \
    apt-get install -y -q docker-ce-cli docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/* && \
    usermod -aG root jenkins
USER jenkins
