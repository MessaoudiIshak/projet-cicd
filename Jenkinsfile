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
    }

    post {
        always {
            echo 'Pipeline complete — coverage available in Test stage output'
        }
        success {
            echo 'TaskFlow API deployed successfully — http://localhost/api/tasks'
        }
        failure {
            echo 'Build failed — check the failed stage output above'
        }
    }
}
