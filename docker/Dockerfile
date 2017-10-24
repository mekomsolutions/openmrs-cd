FROM jenkins/jenkins:2.82
MAINTAINER Mekom Solutions <info@mekomsolutions.com> 

USER root

RUN apt-get update
RUN apt-get -y install nano
RUN apt-get -y install openssh-server

# These packages are needed for Jenkins to build some projects.
# This is because the Jenkins server is used as its own agent. Build tasks are running directly on it.
RUN apt-get -y install ruby-full
RUN apt-get -y install ruby-compass
RUN apt-get -y install xvfb
RUN apt-get -y install firefox-esr
RUN apt-get -y install sudo

# Installing Node.js
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
RUN sudo apt-get install -y nodejs

# Jenkins needs to be a sudo to execute some build tasks (particularly Bahmni Apps)
RUN echo "jenkins ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers


USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

COPY security.groovy /usr/share/jenkins/ref/init.groovy.d/security.groovy

COPY ./plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins.txt

COPY ./nexus.js /usr/share/jenkins/ref/nexus.js
COPY ./package.json /usr/share/jenkins/ref/package.json
COPY ./m2.settings.xml.j2 /usr/share/jenkins/ref/m2.settings.xml.j2