# Configuração do CloudWatch Logs na EC2

## Passo 1 — Criar IAM Role para a EC2

No console AWS:

1. Vá em **IAM → Roles → Create role**
2. Trusted entity: **AWS service → EC2**
3. Adicione a policy: `CloudWatchAgentServerPolicy`
4. Nome da role: `EC2CloudWatchRole`
5. Attach the role na EC2: vá na instância → **Actions → Security → Modify IAM role** → selecione `EC2CloudWatchRole`

---

## Passo 2 — Instalar o CloudWatch Agent na EC2

SSH na instância e rode:

```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
```

---

## Passo 3 — Configurar o agente

O PM2 salva os logs em `~/.pm2/logs/`. Para ver os nomes exatos dos arquivos, rode `pm2 logs --lines 0`.

Crie o arquivo de configuração:

```bash
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

Conteúdo:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/backend-api-out.log",
            "log_group_name": "easy-langue/backend/stdout",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/backend-api-error.log",
            "log_group_name": "easy-langue/backend/stderr",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/frontend-web-error.log",
            "log_group_name": "easy-langue/frontend/stderr",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "easy-langue/nginx/error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

---

## Passo 4 — Iniciar o agente

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Verificar se está rodando
sudo systemctl status amazon-cloudwatch-agent

# Se precisar reiniciar o agente:
sudo systemctl restart amazon-cloudwatch-agent
```

---
# Ver logs no terminal

tail -f ~/.pm2/logs/backend-api-out.log ~/.pm2/logs/backend-api-error.log


## Passo 5 — Ver os logs no console AWS

1. Vá em **CloudWatch → Log groups**
2. Os grupos disponíveis serão:
   - `easy-langue/backend/stdout`
   - `easy-langue/backend/stderr`
   - `easy-langue/frontend/stderr`
   - `easy-langue/nginx/error`
3. Clique no grupo → clique no stream → veja os logs em tempo real

# Entendendo os arquivos

Note que o clodwatch cria 3 arquivos (3 log groups). 

  - easy-langue/backend/stdout — logs normais: this.logger.log(), this.logger.warn(), requisições HTTP, startup do
  NestJS
  - easy-langue/backend/stderr — erros: this.logger.error(), exceções não capturadas, stack traces
  - easy-langue/nginx/error — erros do nginx: rotas não encontradas, falhas de proxy, certificado SSL


### Buscar erros com Log Insights

Vá em **CloudWatch → Log Insights**, selecione o grupo e rode:

```
fields @timestamp, @message
| filter @message like "Falha ao processar"
| sort @timestamp desc
| limit 20
```
