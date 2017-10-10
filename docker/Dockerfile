FROM jenkins/jenkins:2.82
MAINTAINER Mekom Solutions <info@mekomsolutions.com> 

USER root

RUN apt-get update
RUN apt-get -y install nano
RUN apt-get -y install openssh-server

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"

COPY security.groovy /usr/share/jenkins/ref/init.groovy.d/security.groovy

COPY ./plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN /usr/local/bin/install-plugins.sh < /usr/share/jenkins/ref/plugins.txt
