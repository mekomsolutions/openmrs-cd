ARG VERSION=2.346.3
FROM jenkins/jenkins:$VERSION
MAINTAINER Mekom Solutions <support@mekomsolutions.com>

USER root

# Add the APP_DATA_DIR volume to keep OpenMRS CD data out of the Jenkins Home
ARG APP_DATA_DIR="/var/lib/openmrs_cd/app_data"
RUN mkdir -p $APP_DATA_DIR && chown -R jenkins:jenkins $APP_DATA_DIR

RUN apt update --fix-missing
RUN apt -y install nano jq openssh-server rsync libxml2-utils

# These packages are needed for Jenkins to build some projects.
# This is because the Jenkins server is used as its own agent. Build tasks are running directly on it.
RUN apt -y install ruby-full ruby-dev ruby-ffi xvfb firefox-esr sudo libaio1

# Installing Node.js
RUN curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
RUN sudo apt install -y nodejs

# Jenkins needs to be a sudo to execute some build tasks (particularly Bahmni Apps)
RUN echo "jenkins ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Provide access to the /usr/share/jenkins directory
RUN chown -R jenkins /usr/share/jenkins

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false -Dpermissive-script-security.enabled=true"

COPY ./config/plugins.txt /usr/share/jenkins/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/plugins.txt

COPY ./resources/artifact_repo.js /usr/share/jenkins/artifact_repo.js
COPY ./config/artifact_repo_default.json /usr/share/jenkins/artifact_repo_default.json
COPY ./resources/package.json /usr/share/jenkins/package.json
COPY ./resources/m2_settings.xml.template /usr/share/jenkins/m2_settings.xml.template
COPY ./config/artifact_types.json /usr/share/jenkins/artifact_types.json
