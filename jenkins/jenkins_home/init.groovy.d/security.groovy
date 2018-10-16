#!groovy

import jenkins.model.*
import hudson.security.*
import jenkins.security.s2m.AdminWhitelistRule

def hudsonRealm = new HudsonPrivateSecurityRealm(false)
hudsonRealm.createAccount("admin", "password")
Jenkins.getInstance().setSecurityRealm(hudsonRealm)

Jenkins.getInstance().getInjector().getInstance(AdminWhitelistRule.class).setMasterKillSwitch(false)