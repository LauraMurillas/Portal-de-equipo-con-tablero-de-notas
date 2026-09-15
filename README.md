# Portal de equipo con Notas (Prueba técnica)
## Presentada por Laura Murillas 
### Contacto: lauramurillas0000@gmail.com 

Aplicación local para que un equipo consulte su actividad, organice notas en un lienzo compartido, con autenticación, roles, persistencia, métricas y una Lambda preparada para AWS.

La aplicación permite iniciar y cerrar sesión. Su primera página es una página de inicio de sesión. El dashboard, el tablero y la administración de usuarios son accesibles unicamente a usuarios autenticados.

Existen dos roles:

| Rol | Descripción |
| --- | --- |
| Administrador | Puede utilizar el tablero y el dashboard, además de administrar usuarios. Tiene permitido listar, crear y editar usuarios, asignar su rol y desactivarlos o reactivarlos |
| Usuario | Puede utilizar el tablero y el dashboard. |


Cada usuario tiene nombre, correo electrónico, rol y estado activo o inactivo. 

## Restricciones 
Los usuarios inactivos no pueden acceder ni continuar utilizando el área autenticada. Debe conservarse siempre al menos un administrador activo.


## Stack

- `apps/web`: React + TypeScript + Vite.
- `apps/api`: Express + TypeScript + Prisma.
- `database/prisma`: PostgreSQL local, con esquema relacional y seed reproducible.
- `lambda/metrics`: handler AWS Lambda que calcula métricas consultando PostgreSQL.
- `infra`: Docker Compose, Dockerfiles, plantilla SAM de métricas y plantillas CloudFormation para EC2 y S3/CloudFront.

## Requisitos

Por favor verifique que cuente con las siguientes versiones:

- Node.js 20 o superior
- npm 10 o superior
- Docker Desktop
- Docker compose version


## Ejecutar localmente

Una vez tenga Docker Desktop abierto en su equipo local, ejecute:

```powershell
npm install
npm run db:generate
docker compose up -d postgres
npm run db:push
npm run db:seed
npm run dev
```

La API queda en `http://localhost:4000` y el frontend en `http://localhost:5173`.

Cuentas DEMO: `admin@equipo.local` / `Admin123!`; `maria@equipo.local` / `User123!`.

## Pruebas

```powershell
npm run build
npm test
```

La Lambda puede compilarse con `npm run build -w lambda/metrics`. Requiere `DATABASE_URL` y consulta la tabla `Note` de PostgreSQL. Para probarla con SAM, compila el paquete y ejecuta `sam local start-api -t infra/sam/template.yaml --parameter-overrides DatabaseUrl=$env:DATABASE_URL`.

### NOTA IMPORTANTE
Si anteriormente ha trabajo con Prisma, puede que obtenga un error al ejecutar la linea: 
```
npm run db:push
```

Este error se debe a que algún proceso podría estar usando Prisma, y se soluciona fácilmente ejecutando lo siguiente desde su terminal powershell:

Detenga los procesos que puedan estar usando Prisma
```
Get-Process node,esbuild,prisma -ErrorAction SilentlyContinue |
  Stop-Process -Force
```
Y elimine únicamente los archivos regenerables de Prisma:
```
Remove-Item ".\node_modules\.prisma" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item ".\node_modules\@prisma\client" -Recurse -Force -ErrorAction SilentlyContinue
```
Despues de esto vuelva a regenerar el cliente ejecutando desde el comienzo con `npm install`

## Despliegue

PostgreSQL se ejecuta localmente en Docker con el volumen `postgres-data`; no requiere cuenta AWS ni servicios de pago. La API protege notas, tablero, métricas y administración con JWT; las notas son compartidas y conservan `status`, `x` e `y`. En AWS, sustituye `DATABASE_URL` por PostgreSQL gestionado y despliega la API en un contenedor sobre EC2, el frontend estático en S3/CloudFront y `lambda/metrics` mediante SAM. `JWT_SECRET` debe ser un secreto de entorno real en producción.

### Despliegue AWS

Requisitos adicionales: AWS CLI configurado, SAM CLI, una imagen de la API publicada en ECR (o un registro accesible por EC2), una AMI de Amazon Linux, una subred y un security group. Crea previamente los parámetros SSM `DATABASE_URL_PARAMETER` y `JWT_SECRET_PARAMETER` como valores `SecureString`. EC2 y CloudFront son recursos AWS y no se emulan en local; la demostración local usa Docker Compose.

Las plantillas son `infra/sam/template.yaml` (métricas), `infra/cloudformation/api-ec2.yaml` (API en Docker) e `infra/cloudformation/frontend.yaml` (bucket S3 privado y CloudFront con OAC). Configura los valores operativos sin escribir secretos en los scripts:

```powershell
$env:AWS_REGION = 'eu-west-1'
$env:API_IMAGE_URI = '123456789012.dkr.ecr.eu-west-1.amazonaws.com/portal-api:latest'
$env:ECR_REGISTRY_URI = '123456789012.dkr.ecr.eu-west-1.amazonaws.com'
$env:AMI_ID = 'ami-xxxxxxxxxxxxxxxxx'
$env:SUBNET_ID = 'subnet-xxxxxxxxxxxxxxxxx'
$env:SECURITY_GROUP_ID = 'sg-xxxxxxxxxxxxxxxxx'
$env:DATABASE_URL_PARAMETER = '/portal/DATABASE_URL'
$env:JWT_SECRET_PARAMETER = '/portal/JWT_SECRET'
./scripts/deploy.ps1
./scripts/destroy.ps1
```

En Linux/macOS, exporta las mismas variables y ejecuta `./scripts/deploy.sh` o `./scripts/destroy.sh`. El despliegue publica primero la Lambda con SAM, crea EC2 y S3/CloudFront, compila el frontend, sincroniza `apps/web/dist` al bucket privado e invalida la distribución. La eliminación vacía el bucket antes de borrar los stacks. Los scripts esperan que las credenciales AWS estén configuradas mediante el mecanismo estándar de AWS CLI.

## Variables y datos demo

`DATABASE_URL=postgresql://portal:portal@localhost:5432/portal?schema=public` y `JWT_SECRET` son las variables mínimas para ejecutar la API fuera de Compose. El seed crea `admin@equipo.local / Admin123!` y `maria@equipo.local / User123!`. El administrador puede crear usuarios, activar/desactivar miembros y nunca puede dejar el sistema sin un administrador activo.

## Estructura del proyecto
```
Portal de equipo con Notas/
├── .env                    # Variables locales, no se sube a Git
├── .env.example            # Plantilla de variables de entorno
├── .gitignore
├── docker-compose.yml      # PostgreSQL, API y frontend
├── package.json            # Scripts y workspaces del monorepo
├── package-lock.json
├── README.md
│
├── apps/
│   ├── api/                # Backend Express + Prisma
│   │   ├── .env            # Variables específicas de la API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── server.ts       # API, rutas, auth y lógica principal
│   │   │   └── server.test.ts  # Tests del backend
│   │   └── prisma/
│   │       ├── seed.ts         # Usuarios y notas demo
│   │       └── seed.js
│   │
│   └── web/                # Frontend React + Vite
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx        # Aplicación React y vistas
│           ├── styles.css      # Estilos de la interfaz
│           └── vite-env.d.ts
│
├── database/
│   └── prisma/
│       └── schema.prisma       # Modelos User y Note
│
├── lambda/
│   └── metrics/                # Lambda de métricas
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── handler.ts      # Cálculo de métricas desde PostgreSQL
│           └── pg.d.ts
│
├── packages/
│   └── shared/                 # Tipos compartidos frontend/backend
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
│
├── infra/
│   ├── docker/
│   │   ├── api.Dockerfile      # Imagen Docker de la API
│   │   └── web.Dockerfile      # Imagen Docker del frontend
│   ├── sam/
│   │   └── template.yaml       # Lambda + API Gateway
│   └── cloudformation/
│       ├── api-ec2.yaml        # API desplegada en EC2
│       └── frontend.yaml        # S3 privado + CloudFront
│
└── scripts/
    ├── deploy.ps1              # Despliegue AWS en PowerShell
    ├── destroy.ps1             # Eliminación AWS en PowerShell
    ├── deploy.sh               # Despliegue AWS en Linux/macOS
    └── destroy.sh              # Eliminación AWS en Linux/macOS
```
- En la carpeta `metrics` se encuentra la función AWS Lambda que consulta PostgreSQL
- En la carpeta `infra` se encuentra la infraestructura:
    -Dockerfiles.
    -AWS SAM.
    -Lambda y API Gateway.
    -EC2 para la API.
    -S3 y CloudFront para el frontend.
- En la carpeta `scripts` se encuentran los comandos automatizados de despliegue y eliminación de recursos AWS.


