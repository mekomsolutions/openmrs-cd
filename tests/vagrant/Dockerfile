FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    openssh-server \
    sudo \
    rsync \
    ncat \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/run/sshd \
  && useradd -m -s /bin/bash cdagent \
  && echo "cdagent ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/cdagent \
  && chmod 440 /etc/sudoers.d/cdagent \
  && mkdir -p /home/cdagent/.ssh \
  && chmod 700 /home/cdagent/.ssh

COPY keys/authorized_keys /home/cdagent/.ssh/authorized_keys

RUN chown -R cdagent:cdagent /home/cdagent/.ssh \
  && chmod 600 /home/cdagent/.ssh/authorized_keys \
  && sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config \
  && sed -i 's/^#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config \
  && sed -i 's/^#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D", "-e"]
