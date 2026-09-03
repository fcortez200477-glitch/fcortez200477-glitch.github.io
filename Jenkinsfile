pipeline {
    agent any

    stages{
        stage('Verificar Ferramentas'){
            steps{
                sh 'echo "Verificando Ferramentas"'
                sh 'docker -v || echo "Docker is not available"'
                sh 'docker-compose -v || echo "Docker Compose is not available"'
            }
        }
        stage('Derrubar Containers'){
            steps{
                sh 'echo "Derrubando Containers"'
                sh 'docker-compose down'
                
            }
        }
        stage('Subir Containers'){
            steps{
                sh 'echo "Subindo Containers"'
                sh 'docker-compose up -d --build'
            }
        }
    }

}