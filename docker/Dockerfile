FROM jenkins/jenkins:2.121
MAINTAINER Mekom Solutions <support@mekomsolutions.com> 

USER root

RUN apt update
RUN apt -y install nano
RUN apt -y install openssh-server
RUN apt -y install rsync
RUN apt -y install libxml2-utils # for xmllint

# These packages are needed for Jenkins to build some projects.
# This is because the Jenkins server is used as its own agent. Build tasks are running directly on it.
RUN apt -y install ruby-full
RUN apt -y install ruby-compass
RUN apt -y install xvfb
RUN apt -y install firefox-esr
RUN apt -y install sudo
RUN apt -y install rsync

# Installing Node.js
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
RUN sudo apt install -y nodejs

# Jenkins needs to be a sudo to execute some build tasks (particularly Bahmni Apps)
RUN echo "jenkins ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Provide access to the /usr/share/jenkins directory
RUN chown -R jenkins /usr/share/jenkins

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

COPY ./resources/security.groovy /usr/share/jenkins/init.groovy.d/security.groovy

COPY ./config/plugins.txt /usr/share/jenkins/plugins.txt
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/plugins.txt

COPY ./resources/artifact_repo.js /usr/share/jenkins/artifact_repo.js
COPY ./config/artifact_repo_default.json /usr/share/jenkins/artifact_repo_default.json
COPY ./resources/package.json /usr/share/jenkins/package.json
COPY ./resources/m2_settings.xml.template /usr/share/jenkins/m2_settings.xml.template
COPY ./config/artifact_types.json /usr/share/jenkins/artifact_types.json
COPY ./config/webhook_triggers.json /usr/share/jenkins/webhook_triggers.json