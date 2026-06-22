pipeline {
    agent any

    tools {
        nodejs 'NodeJS-20'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Build Docker') {
            steps {
                sh "docker build -t taskflow-api:latest -t taskflow-api:build-${env.BUILD_NUMBER} ."
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'mongo-uri', variable: 'MONGO_URI')]) {
                    sh '''
                        echo "PORT=5000" > .env
                        echo "MONGO_URI=${MONGO_URI}" >> .env
                        docker compose --project-name projetcicd up -d --build api
                    '''
                }
            }
        }

        stage('Notify GitHub') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        curl -s -X POST \
                          -H "Authorization: token ${GITHUB_TOKEN}" \
                          -H "Content-Type: application/json" \
                          -d "{\\"state\\":\\"success\\",\\"target_url\\":\\"http://localhost:8090\\",\\"description\\":\\"Pipeline passed\\",\\"context\\":\\"ci/jenkins\\"}" \
                          "https://api.github.com/repos/MessaoudiIshak/projet-cicd/statuses/${GIT_COMMIT}"
                    '''
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline complete — coverage available in Test stage output'
        }
        success {
            echo 'TaskFlow API deployed successfully — http://localhost/api/tasks'
        }
        failure {
            withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                sh '''
                    curl -s -X POST \
                      -H "Authorization: token ${GITHUB_TOKEN}" \
                      -H "Content-Type: application/json" \
                      -d "{\\"state\\":\\"failure\\",\\"target_url\\":\\"http://localhost:8090\\",\\"description\\":\\"Pipeline failed\\",\\"context\\":\\"ci/jenkins\\"}" \
                      "https://api.github.com/repos/MessaoudiIshak/projet-cicd/statuses/${GIT_COMMIT}"
                '''
            }
            echo 'Build failed — check the failed stage output above'
        }
    }
}
