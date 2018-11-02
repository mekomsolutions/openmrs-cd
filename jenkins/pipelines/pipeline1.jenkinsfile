// Name the build out of the parameters
node {
  currentBuild.displayName = "${repoUrl}".substring("${repoUrl}".lastIndexOf("/") + 1) + " - " + "${branchName}"
}

pipeline {
  agent any
  options {
    ansiColor('xterm')
  }
  tools {
    maven 'Maven 3.5.0' 
    nodejs 'NodeJS 8.6.0'
  }
  stages {
    stage ('Checkout the code and identify all Maven artifacts') {
      steps {
        checkout scm: [$class: 'GitSCM', userRemoteConfigs: [[url: repoUrl]], branches: [[name: branchName]]], poll: false
        sh 'find . -mindepth 1 -maxdepth 2 -name pom.xml -exec xmllint --xpath "//*[local-name()=\'project\']/*[local-name()=\'artifactId\']/text()" {} \\; -exec echo \\; > $BUILD_PATH/artifacts_ids.txt'
      }
    }
    stage ('Build the project') {
      steps {
        sh 'node /opt/node-scripts/src/$JOB_NAME/build.js'
        sh 'cat $BUILD_PATH/build.sh'
        sh '$BUILD_PATH/build.sh'
        sh '. $BUILD_PATH/artifact.env ; mv $WORKSPACE/$buildPath/$filename $WORKSPACE/$destFilename'
      }
    }
    stage ('Deploy the built artifacts to their repository') {
      when {
        expression { return env.artifactsDeployment == "true" }
      }
      steps {
        sh 'cat $BUILD_PATH/deploy.sh'
        sh '$BUILD_PATH/deploy.sh $JENKINS_HOME/artifact_repository.env'
      }
    }
    stage ('Trigger possible downstream builds and/or save the current build parameters') {
      steps {
        sh 'node /opt/node-scripts/src/$JOB_NAME/downstream-builds.js'
        script {
          def buildsParamsPath = "${env.BUILD_PATH}/builds_params.json"
          if (fileExists(buildsParamsPath)) {
            def params = readJSON file: buildsParamsPath
            for (i = 0; i < params.size(); i++) {
              build job: 'pipeline1', wait: false, parameters: \
              [ \
                string(name: 'projectType', value: params[i]['projectType']), \
                string(name: 'repoUrl', value: params[i]['repoUrl']), \
                string(name: 'branchName', value: params[i]['branchName']), \
                booleanParam(name: 'artifactsDeployment', value: true) \
              ]
            }
          }
        }
      }
    }
    stage ('Identify impacted instances and append instances events log') {
      steps {
        sh 'node /opt/node-scripts/src/$JOB_NAME/identify-instances.js'
      }
    }
  }
}
