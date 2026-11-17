# HuertoHogar — Backend con NestJS y microservicios

Backend de la tienda en línea **HuertoHogar**, hecho para la asignatura **Fullstack 2**. Es el servidor del frontend `huerto-hogar-react-mfe` (React con micro-frontends): guarda los usuarios, los productos y sus imágenes, autentica con JWT y protege las operaciones de administración.

## Qué problema resuelve

En la primera versión del proyecto los productos y los usuarios vivían en el navegador (IndexedDB), con contraseñas en texto plano y sin forma de compartir los cambios entre clientes. HuertoHogar necesita:

- Un **catálogo único** que el administrador pueda editar y que todos los clientes vean actualizado.
- **Cuentas de usuario seguras**, con contraseñas protegidas y sesiones que expiren.
- **Roles** (cliente y administrador) validados en el servidor, no en el navegador.
- Un lugar donde guardar las **imágenes** de los productos, que funcione igual en desarrollo y en la nube.

Además del caso de negocio, el proyecto aplica la misma idea de arquitectura que el frontend: **separar el sistema por dominio** (autenticación, usuarios y productos) en servicios que se desarrollan y despliegan de forma independiente.

## Cómo lo hace

Es un **monorepo de NestJS** con cuatro aplicaciones y dos bibliotecas compartidas:

```
navegador ──HTTP/JSON──▶ API Gateway :3000  (huerto-hogar-backend)
                         JWT, roles, CORS, validación, subida de imágenes
                              │ TCP
          ┌───────────────────┼────────────────────────┐
          ▼                   ▼                        ▼
   auth-service :3003   users-service :3001     products-service :3002
   tokens y bcrypt      usuarios y roles        productos y categorías
          │                   │                        │
          └──TCP──▶ users     ▼                        ▼
                         PostgreSQL               PostgreSQL     ──▶ S3 / disco
                         users_db                 products_db        (imágenes)
```

- **`apps/huerto-hogar-backend`** (API Gateway): la única aplicación HTTP. Recibe las peticiones del frontend, valida el token y el rol, convierte los errores de los microservicios en respuestas HTTP y reenvía cada operación al servicio que corresponde. También recibe las imágenes y las sube al almacenamiento.
- **`apps/auth-service`**: registro, inicio de sesión, emisión y rotación de tokens y cierre de sesión. No tiene base de datos propia: le pide los datos al servicio de usuarios.
- **`apps/users-service`**: usuarios y roles en `users_db`. Hashea las contraseñas de los usuarios creados por un administrador y aplica las reglas de negocio (no eliminarse a sí mismo, no quitarse el rol de administrador).
- **`apps/products-service`**: productos y categorías en `products_db`. Genera los códigos de producto y borra las imágenes que quedan sin uso.
- **`libs/contracts`** (`@app/contracts`): DTOs con sus validaciones, respuestas, patrones de mensajes y el formato de error `RpcError`. Es el "contrato" que comparten el gateway y los servicios.
- **`libs/storage`** (`@app/storage`): almacenamiento de imágenes con dos implementaciones, disco local y AWS S3, detrás de la misma interfaz.

### Flujo de una petición

1. El frontend llama, por ejemplo, a `PATCH /products/FR001` con `Authorization: Bearer <accessToken>`.
2. En el gateway, `JwtAuthGuard` verifica la firma y la vigencia del token y `RolesGuard` exige el rol `ADMIN`.
3. `ValidationPipe` valida el cuerpo con el DTO de `@app/contracts` y rechaza campos que no estén declarados.
4. El gateway envía el mensaje `products.update` por TCP a products-service, que vuelve a validar el mensaje, actualiza la base de datos y responde.
5. Si el servicio lanza un error (`RpcException` con `{ statusCode, message }`), el filtro `RpcToHttpFilter` del gateway lo devuelve con el mismo código HTTP (400, 401, 403, 404 o 409) y su mensaje en español.

### Autenticación

- `POST /auth/login` devuelve un **access token** (15 min) con `sub`, `email` y `role`, y un **refresh token** (7 días) con su propio secreto y un `jti` aleatorio.
- En la base de datos se guarda solo el **hash SHA-256 del refresh token** vigente (`users.refreshTokenHash`), nunca el token.
- `POST /auth/refresh` **rota** los tokens: entrega un par nuevo y el anterior deja de servir. Si alguien presenta un refresh token válido pero que no coincide con el guardado (por ejemplo, uno robado que ya se usó), se **revoca la sesión** completa.
- `POST /auth/logout` borra el hash, así que el refresh token deja de funcionar al instante.
- Cuando un administrador cambia el correo, la contraseña o el rol de otro usuario, también se borra su hash: la sesión de ese usuario termina cuando vence su access token.

### Productos e imágenes

- El **código** del producto se genera con el prefijo de la categoría y un correlativo (`FR004`, `PL001`). `categories.lastProductNumber` guarda el último número usado y se incrementa dentro de una **transacción con bloqueo pesimista** de la categoría, así dos creaciones simultáneas no obtienen el mismo código.
- Las imágenes se suben aparte (`POST /products/images`): el gateway revisa los **bytes iniciales del archivo** (no la extensión ni el `Content-Type`) para aceptar solo JPG, PNG, WEBP, GIF o AVIF de hasta 2 MB, y las guarda como `products/<uuid>.<ext>`. Luego el producto se crea o edita con esa _key_.
- En la base de datos se guarda la **key**, no la URL. La URL pública se arma al responder con `ASSETS_BASE_URL`, así se puede cambiar de bucket, pasar a CloudFront o volver a disco sin migrar datos.
- Al reemplazar o eliminar un producto, products-service borra la imagen anterior si ningún otro producto la usa.
- La tabla `products` tiene `createdAt` y `updatedAt`. Un **trigger de PostgreSQL** (`TRG_products_updated_at`) actualiza `updatedAt` en cada `UPDATE`, venga de la API o de SQL directo. `GET /products/versions` devuelve solo `id` y `updatedAt`, y el frontend lo usa para descargar únicamente los productos que cambiaron desde la última visita.

## Tecnologías

| Tecnología                              | Uso                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **NestJS 12**                           | Framework de la API y de los microservicios: módulos, inyección de dependencias, guards, pipes y filtros.    |
| **@nestjs/microservices (TCP)**         | Comunicación entre el gateway y los servicios con patrones de mensaje (`users.findAll`, `products.create`…). |
| **TypeScript**                          | Tipado estricto en todo el monorepo, con módulos ES.                                                         |
| **PostgreSQL 17**                       | Base de datos relacional: `users_db` y `products_db`.                                                        |
| **TypeORM**                             | Entidades, repositorios, transacciones y migraciones versionadas.                                            |
| **class-validator / class-transformer** | Validación declarativa de los DTOs y transformación de tipos.                                                |
| **@nestjs/jwt**                         | Firma y verificación de access y refresh tokens.                                                             |
| **bcrypt**                              | Hash de contraseñas con sal (factor de costo 10).                                                            |
| **@nestjs/config + dotenv**             | Configuración por variables de entorno, un `.env` por aplicación.                                            |
| **AWS SDK v3 (`@aws-sdk/client-s3`)**   | Subida y borrado de imágenes en S3.                                                                          |
| **Multer** (`@nestjs/platform-express`) | Recepción de archivos `multipart/form-data`.                                                                 |
| **Rspack**                              | Compilación de cada aplicación (`nest build` con `builder: rspack`).                                         |
| **Vitest + Supertest**                  | Pruebas unitarias y end-to-end.                                                                              |
| **oxlint + Prettier**                   | Linter con reglas basadas en tipos y formato del código.                                                     |
| **Docker + Docker Compose**             | Imagen única para los 4 servicios, migraciones y seeds, y orquestación con Postgres.                         |
| **pnpm**                                | Gestor de paquetes del monorepo.                                                                             |

## Decisiones técnicas

- **Microservicios por dominio.** Autenticación, usuarios y productos cambian por motivos distintos. Separarlos permite desplegarlos, escalarlos o reescribirlos por separado, y deja claro qué servicio es dueño de cada dato. Es la misma idea que los micro-frontends del cliente.
- **Un API Gateway como única puerta de entrada.** El navegador conoce una sola URL y una sola política de CORS; la autenticación y los roles se revisan en un solo lugar y los servicios internos no quedan expuestos (en Docker solo se publica el puerto 3000).
- **TCP entre servicios en vez de HTTP.** Es el transporte nativo de `@nestjs/microservices`: no necesita rutas ni serializar a mano, y los servicios quedan como simples manejadores de mensajes.
- **Una base de datos por servicio.** `users_db` y `products_db` son independientes; ningún servicio lee las tablas de otro. Cuando auth-service necesita un usuario, se lo pide a users-service.
- **auth-service sin base de datos.** Su responsabilidad es la criptografía (hash, firma y rotación de tokens), no guardar usuarios. Así, las contraseñas en texto plano nunca llegan a users-service por el registro: llegan ya hasheadas.
- **Contratos compartidos en `libs/contracts`.** El gateway y los servicios usan los mismos DTOs y patrones, así un cambio en un mensaje rompe la compilación en vez de fallar en producción. Las validaciones se ejecutan en el gateway (HTTP) y otra vez en cada servicio (TCP), porque un servicio no debe confiar en quien le habla.
- **Errores con forma común.** Los servicios lanzan `RpcException` con `{ statusCode, message }` y el gateway los traduce a HTTP. Los mensajes están en español porque el frontend los muestra tal cual en los formularios.
- **Access token corto y refresh token rotativo.** Un access token robado sirve como máximo 15 minutos; el refresh token rota en cada uso y su reutilización revoca la sesión, lo que permite detectar robos. Guardar solo el hash del refresh token evita que una filtración de la base de datos entregue sesiones válidas.
- **Roles en el token y en la base de datos.** El rol viaja en el access token para que el gateway no consulte la base de datos en cada petición; `GET /auth/me` devuelve el rol real para que el frontend no confíe en lo guardado en el navegador.
- **Códigos de producto legibles.** El caso usa códigos como `FR001`, así que se mantienen como clave primaria en vez de un id numérico. El correlativo por categoría no se reutiliza aunque se elimine un producto.
- **Almacenamiento intercambiable.** `libs/storage` expone `put`, `delete` y `publicUrl`. En desarrollo se usa disco (el gateway sirve `/uploads` con caché inmutable de un año) y en producción S3, cambiando solo `STORAGE_DRIVER`. Las keys llevan un UUID, así una imagen nueva nunca pisa a otra en caché.
- **Sin claves de AWS en el código.** En EC2 el SDK toma los permisos del rol IAM de la instancia.
- **Migraciones en vez de `synchronize`.** El esquema cambia solo con migraciones versionadas y revisables (`synchronize: false`), que se aplican antes de levantar los servicios.
- **Seeds idempotentes.** Revisan si cada registro existe antes de crearlo, así se pueden ejecutar en cada despliegue sin duplicar datos. Los usuarios de demostración no se crean con `NODE_ENV=production`.
- **Una sola imagen de Docker.** Los 4 servicios comparten dependencias, así que se compila una imagen y cada contenedor elige qué `dist/apps/*/main.js` ejecutar. Las migraciones y los seeds usan otra etapa con las dependencias de desarrollo.

## Estructura

```
├── apps/
│   ├── huerto-hogar-backend/   API Gateway (HTTP :3000)
│   │   └── src/
│   │       ├── auth/            /auth/*
│   │       ├── products/        /products/*, /categories
│   │       ├── users/           /users/*
│   │       ├── uploads/         Detección del tipo de imagen por sus bytes
│   │       └── common/          Guards (JWT, roles), decoradores y filtro RPC → HTTP
│   ├── auth-service/           Tokens y hash (TCP :3003)
│   ├── users-service/          Usuarios y roles (TCP :3001)
│   │   └── src/database/        data-source, migraciones y seeds de users_db
│   └── products-service/       Productos y categorías (TCP :3002)
│       └── src/database/        data-source, migraciones, seeds e imágenes iniciales
├── libs/
│   ├── contracts/              DTOs, respuestas, patrones de mensajes y RpcError
│   └── storage/                Almacenamiento de imágenes (local o S3)
├── docker/                     Script de migraciones/seeds e init de Postgres
├── Dockerfile
└── docker-compose.yml
```

## Puesta en marcha

Requisitos: Node.js, pnpm y PostgreSQL con las bases `users_db` y `products_db`.

```bash
pnpm install
# Copia cada apps/*/.env.example a .env y completa los valores

pnpm migration:run   # migraciones de users_db y products_db
pnpm seed            # roles, usuarios de prueba, categorías y productos (con sus imágenes)
pnpm seed:admin      # opcional: administrador definido en ADMIN_EMAIL / ADMIN_PASSWORD

pnpm start:all       # los 4 servicios en paralelo (API Gateway en http://localhost:3000)
```

También se puede levantar cada servicio en su propia terminal con `pnpm start:users`, `pnpm start:products`, `pnpm start:auth` y `pnpm start:gateway`.

Los seeds no modifican registros que ya existen, así que se pueden ejecutar varias veces.

| Seed              | Crea                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `seed:users`      | Roles `ADMIN` y `CLIENT`                                                                                                        |
| `seed:demo-users` | `admin@huertohogar.cl` / `admin1234` (admin) y `cliente@correo.cl` / `cliente123` (cliente). No corre con `NODE_ENV=production` |
| `seed:products`   | Categorías (`FR`, `VR`, `PO`, `PL`) y los 7 productos del catálogo inicial; sube sus imágenes al almacenamiento configurado     |

### Variables de entorno

| Variable                                                          | Dónde              | Descripción                                                                                      |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `PORT`                                                            | gateway            | Puerto HTTP (por defecto 3000)                                                                   |
| `JWT_ACCESS_SECRET`                                               | gateway y auth     | Secreto del access token; debe ser el mismo en ambos                                             |
| `JWT_REFRESH_SECRET`                                              | auth               | Secreto del refresh token, distinto del anterior                                                 |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`                | auth               | Vigencia en segundos (900 y 604800 por defecto)                                                  |
| `CORS_ORIGINS`                                                    | gateway            | Orígenes del frontend separados por coma. Sin definir, se permiten los puertos de Vite 5173–5177 |
| `*_SERVICE_HOST` / `*_SERVICE_PORT`                               | gateway y auth     | Dirección de cada microservicio                                                                  |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | users y products   | Conexión a PostgreSQL                                                                            |
| `STORAGE_DRIVER`                                                  | gateway y products | `local` o `s3`                                                                                   |
| `LOCAL_STORAGE_DIR`                                               | gateway y products | Carpeta de las imágenes en modo local (`uploads`)                                                |
| `S3_BUCKET`, `AWS_REGION`                                         | gateway y products | Bucket y región en modo S3                                                                       |
| `ASSETS_BASE_URL`                                                 | gateway y products | URL pública base de las imágenes                                                                 |
| `ADMIN_FULLNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`                 | users              | Administrador que crea `pnpm seed:admin`                                                         |

## Docker

Solo requiere Docker. Levanta Postgres (con `users_db` y `products_db`), los 3 microservicios y el gateway; únicamente el gateway se publica en el host.

```bash
cp .env.docker.example .env   # completa POSTGRES_PASSWORD y los secretos JWT
docker compose up -d --build  # API Gateway en http://localhost:3000
docker compose logs -f migrate
```

En cada `docker compose up` se ejecuta primero el servicio `migrate` ([docker/migrate.sh](docker/migrate.sh)): aplica las migraciones pendientes de ambas bases y corre los seeds (roles, productos y, según `.env`, los usuarios demo con `SEED_DEMO_USERS=true` y el administrador de `ADMIN_EMAIL`/`ADMIN_PASSWORD`). Los servicios arrancan solo si termina sin errores y se reinician solos si se caen (`restart: unless-stopped`).

| Imagen                                      | Uso                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `huerto-backend` (target `runtime`)         | Los 4 servicios; el `command` de cada uno elige qué `dist/apps/*/main.js` ejecutar. Solo dependencias de producción y usuario sin privilegios (`node`) |
| `huerto-backend-migrate` (target `migrate`) | Migraciones y seeds con `ts-node` (incluye dependencias de desarrollo)                                                                                 |

Los datos quedan en los volúmenes `pgdata` y `uploads`; `docker compose down -v` los borra.

## Endpoints (API Gateway)

| Método | Ruta                 | Acceso  | Descripción                                                                                 |
| ------ | -------------------- | ------- | ------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`     | Público | Crea una cuenta de cliente                                                                  |
| POST   | `/auth/login`        | Público | Devuelve `user`, `accessToken` y `refreshToken`                                             |
| POST   | `/auth/refresh`      | Público | Rota los tokens (`{ refreshToken }`)                                                        |
| POST   | `/auth/logout`       | Sesión  | Revoca el refresh token                                                                     |
| GET    | `/auth/me`           | Sesión  | Datos actuales del usuario (rol incluido)                                                   |
| GET    | `/products`          | Público | Catálogo. `?ids=FR001,VR002` devuelve solo esos                                             |
| GET    | `/products/versions` | Público | `id` y `updatedAt` de cada producto, para validar la caché del cliente                      |
| GET    | `/products/:id`      | Público | Un producto                                                                                 |
| GET    | `/categories`        | Público | Categorías                                                                                  |
| POST   | `/products/images`   | Admin   | Sube una imagen (`multipart/form-data`, campo `image`, máx. 2 MB) y devuelve `{ key, url }` |
| POST   | `/products`          | Admin   | Crea un producto (`img` = `key` de la imagen). El código se genera por categoría: `FR004`   |
| PATCH  | `/products/:id`      | Admin   | Edita un producto. `discount: 0` quita el descuento                                         |
| DELETE | `/products/:id`      | Admin   | Elimina el producto y su imagen                                                             |
| GET    | `/users`             | Admin   | Lista de usuarios                                                                           |
| GET    | `/users/:id`         | Admin   | Un usuario                                                                                  |
| POST   | `/users`             | Admin   | Crea un usuario con rol `ADMIN` o `CLIENT`                                                  |
| PATCH  | `/users/:id`         | Admin   | Edita nombre, correo, rol o contraseña. Si cambian credenciales o rol, se revoca su sesión  |
| DELETE | `/users/:id`         | Admin   | Elimina un usuario (no la propia cuenta)                                                    |

Las rutas de sesión y admin reciben `Authorization: Bearer <accessToken>`. Sin token o con uno vencido responden **401**; con un usuario que no es administrador, **403**.

### Validaciones principales

| Campo             | Regla                                                           |
| ----------------- | --------------------------------------------------------------- |
| `fullname`        | Texto de 3 a 100 caracteres                                     |
| `email`           | Correo válido y único (409 si ya existe)                        |
| `password`        | Texto de 8 a 100 caracteres                                     |
| `role`            | `ADMIN` o `CLIENT`                                              |
| `name` (producto) | Texto de 3 a 100 caracteres                                     |
| `price`           | Entero entre 1 y 99.999.999 (CLP)                               |
| `discount`        | Entero entre 0 y 100 (%)                                        |
| `stock`           | Entero mayor o igual a 0                                        |
| `description`     | Texto de hasta 1000 caracteres                                  |
| Imagen            | JPG, PNG, WEBP, GIF o AVIF, máx. 2 MB, verificado por contenido |

## Modelo de datos

**users_db**

| Tabla   | Columnas                                                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `roles` | `id` (serial, PK), `role` (único: `ADMIN`, `CLIENT`)                                                                                             |
| `users` | `id` (serial, PK), `fullname`, `email` (único), `password` (hash bcrypt), `refreshTokenHash` (nullable), `roleId` (FK), `createdAt`, `updatedAt` |

**products_db**

| Tabla        | Columnas                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories` | `id` (PK: `FR`, `VR`, `PO`, `PL`), `name`, `lastProductNumber`                                                                                                         |
| `products`   | `id` (PK: `FR001`…), `name`, `price`, `discount` (nullable), `unidadVenta`, `img` (key), `stock`, `description`, `categoryId` (FK), `createdAt`, `updatedAt` (trigger) |

## Imágenes: local y AWS S3

En la base de datos se guarda solo la _key_ (`products/<uuid>.webp`); la URL pública se arma con `ASSETS_BASE_URL`.

- **Desarrollo** (`STORAGE_DRIVER=local`): las imágenes van a `./uploads` y el gateway las sirve en `/uploads`.
- **Producción** (`STORAGE_DRIVER=s3`): las imágenes van al bucket `S3_BUCKET`. El gateway sube y products-service borra las imágenes reemplazadas, así que **ambos** necesitan la misma configuración de almacenamiento.

### Despliegue en EC2 + S3

1. Crea el bucket (por ejemplo `huerto-hogar-imagenes`) y permite la lectura pública de `products/*`, o mejor, ponle delante una distribución de **CloudFront** con _Origin Access Control_ y deja el bucket privado.
2. Crea un **rol IAM** para la instancia EC2 con esta política y asígnalo a la instancia (no hace falta poner claves en el `.env`; el SDK usa el rol automáticamente):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::huerto-hogar-imagenes/products/*"
       }
     ]
   }
   ```

3. En `apps/huerto-hogar-backend/.env` y `apps/products-service/.env` (o en el `.env` de Docker):

   ```env
   STORAGE_DRIVER=s3
   S3_BUCKET=huerto-hogar-imagenes
   AWS_REGION=us-east-1
   ASSETS_BASE_URL=https://dxxxxxxxxxxxx.cloudfront.net   # o la URL del bucket
   ```

4. En el gateway define `CORS_ORIGINS` con los dominios del frontend, y compila el frontend con `VITE_API_URL` apuntando al gateway.
5. Ejecuta `pnpm migration:run` y `pnpm seed:users && pnpm seed:products` (el seed de productos sube las 7 imágenes al bucket), o simplemente `docker compose up -d --build`. En producción crea el administrador con `pnpm seed:admin` (o `ADMIN_EMAIL`/`ADMIN_PASSWORD` en Docker) y una contraseña segura en lugar de `seed:demo-users`.

## Pruebas y calidad

```bash
pnpm test        # pruebas unitarias (Vitest)
pnpm test:e2e    # pruebas end-to-end
pnpm test:cov    # cobertura
pnpm lint        # oxlint con reglas basadas en tipos
pnpm format      # Prettier
```

Las pruebas unitarias cubren los controladores y servicios de auth, users y products con los repositorios y clientes TCP simulados.

## Limitaciones conocidas

- Se guarda **un solo refresh token por usuario**: iniciar sesión en otro navegador cierra la sesión del anterior cuando vence su access token.
- Los tokens viajan en el cuerpo de las respuestas y el frontend los guarda en `localStorage`. Un refresh token en cookie `HttpOnly` sería más robusto frente a XSS.
- No hay límite de intentos de inicio de sesión ni registro de auditoría.
- El transporte TCP entre servicios no está cifrado; se asume que corren en una red privada (la red interna de Docker).
- No hay pedidos ni pagos: la compra del frontend es simulada y el stock solo cambia cuando lo edita un administrador.
