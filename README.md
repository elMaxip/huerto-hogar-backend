# HuertoHogar — Backend

Backend de la tienda HuertoHogar con **NestJS** y microservicios. El frontend (`fullstack-ev-2`) solo habla con el API Gateway.

```
navegador ──HTTP──▶ huerto-hogar-backend :3000 (API Gateway, JWT, CORS, subida de imágenes)
                        │ TCP
          ┌─────────────┼──────────────────────┐
          ▼             ▼                      ▼
   auth-service:3003  users-service:3001   products-service:3002
   (tokens, hash)     (users_db)           (products_db)
          └──TCP──▶ users-service
```

`libs/contracts` tiene los DTOs y patrones de mensajes compartidos y `libs/storage` el almacenamiento de imágenes (disco local o S3).

## Puesta en marcha

Requisitos: Node.js, pnpm y PostgreSQL con las bases `users_db` y `products_db`.

```bash
pnpm install
# Copia cada apps/*/.env.example a .env y completa los valores

pnpm migration:run   # migraciones de users_db y products_db
pnpm seed            # roles, usuarios de prueba, categorías y productos (con sus imágenes)
pnpm seed:admin      # opcional: administrador definido en ADMIN_EMAIL / ADMIN_PASSWORD

# Un proceso por servicio
pnpm start:users
pnpm start:products
pnpm start:auth
pnpm start:dev       # API Gateway en http://localhost:3000
```

Los seeds no modifican registros que ya existen, así que se pueden ejecutar varias veces.

| Seed | Crea |
| --- | --- |
| `seed:users` | Roles `ADMIN` y `CLIENT` |
| `seed:demo-users` | `admin@huertohogar.cl` / `admin1234` (admin) y `cliente@correo.cl` / `cliente123` (cliente). No corre con `NODE_ENV=production` |
| `seed:products` | Categorías (`FR`, `VR`, `PO`, `PL`) y los 7 productos del catálogo inicial; sube sus imágenes al almacenamiento configurado |

## Docker

Solo requiere Docker. Levanta Postgres (con `users_db` y `products_db`), los 3 microservicios y el gateway; únicamente el gateway se publica en el host.

```bash
cp .env.docker.example .env   # completa POSTGRES_PASSWORD y los secretos JWT
docker compose up -d --build  # API Gateway en http://localhost:3000
docker compose logs -f migrate
```

En cada `docker compose up` se ejecuta primero el servicio `migrate` ([docker/migrate.sh](docker/migrate.sh)): aplica las migraciones pendientes de ambas bases y corre los seeds (roles, productos y, según `.env`, los usuarios demo con `SEED_DEMO_USERS=true` y el administrador de `ADMIN_EMAIL`/`ADMIN_PASSWORD`). Los servicios arrancan solo si termina sin errores. Como los seeds son idempotentes, volver a ejecutarlo no duplica datos.

| Imagen | Uso |
| --- | --- |
| `huerto-backend` (target `runtime`) | Los 4 servicios; el `command` de cada uno elige qué `dist/apps/*/main.js` ejecutar |
| `huerto-backend-migrate` (target `migrate`) | Migraciones y seeds con `ts-node` (incluye dependencias de desarrollo) |

Los datos quedan en los volúmenes `pgdata` y `uploads`; `docker compose down -v` los borra.

## Endpoints (API Gateway)

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/register` | Público | Crea una cuenta de cliente |
| POST | `/auth/login` | Público | Devuelve `user`, `accessToken` y `refreshToken` |
| POST | `/auth/refresh` | Público | Rota los tokens (`{ refreshToken }`) |
| POST | `/auth/logout` | Sesión | Revoca el refresh token |
| GET | `/auth/me` | Sesión | Datos actuales del usuario (rol incluido) |
| GET | `/products` | Público | Catálogo. `?ids=FR001,VR002` devuelve solo esos |
| GET | `/products/versions` | Público | `id` y `updatedAt` de cada producto, para validar la caché del cliente |
| GET | `/products/:id` | Público | Un producto |
| GET | `/categories` | Público | Categorías |
| POST | `/products/images` | Admin | Sube una imagen (`multipart/form-data`, campo `image`, máx. 2 MB) y devuelve `{ key, url }` |
| POST | `/products` | Admin | Crea un producto (`img` = `key` de la imagen). El código se genera por categoría: `FR004` |
| PATCH | `/products/:id` | Admin | Edita un producto. `discount: 0` quita el descuento |
| DELETE | `/products/:id` | Admin | Elimina el producto y su imagen |
| GET | `/users` | Admin | Lista de usuarios |
| GET | `/users/:id` | Admin | Un usuario |
| POST | `/users` | Admin | Crea un usuario con rol `ADMIN` o `CLIENT` |
| PATCH | `/users/:id` | Admin | Edita nombre, correo, rol o contraseña. Si cambian credenciales o rol, se revoca su sesión |
| DELETE | `/users/:id` | Admin | Elimina un usuario (no la propia cuenta) |

Las rutas de sesión y admin reciben `Authorization: Bearer <accessToken>`.

### `updatedAt` de los productos

La tabla `products` tiene `createdAt` y `updatedAt`. Un trigger de PostgreSQL (`TRG_products_updated_at`) actualiza `updatedAt` en cada `UPDATE`, venga de la API o de SQL directo. El frontend guarda el catálogo en IndexedDB y, con `GET /products/versions`, descarga solo los productos cuyo `updatedAt` cambió.

## Imágenes: local y AWS S3

En la base de datos se guarda solo la *key* (`products/<uuid>.webp`); la URL pública se arma con `ASSETS_BASE_URL`. Así se puede cambiar de bucket o poner CloudFront sin migrar datos.

- **Desarrollo** (`STORAGE_DRIVER=local`): las imágenes van a `./uploads` y el gateway las sirve en `/uploads`.
- **Producción** (`STORAGE_DRIVER=s3`): las imágenes van al bucket `S3_BUCKET`. El gateway sube y products-service borra las imágenes reemplazadas, así que **ambos** necesitan la misma configuración de almacenamiento.

### Despliegue en EC2 + S3

1. Crea el bucket (por ejemplo `huerto-hogar-imagenes`) y permite la lectura pública de `products/*`, o mejor, ponle delante una distribución de **CloudFront** con *Origin Access Control* y deja el bucket privado.
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

3. En `apps/huerto-hogar-backend/.env` y `apps/products-service/.env`:

   ```env
   STORAGE_DRIVER=s3
   S3_BUCKET=huerto-hogar-imagenes
   AWS_REGION=us-east-1
   ASSETS_BASE_URL=https://dxxxxxxxxxxxx.cloudfront.net   # o la URL del bucket
   ```

4. En el gateway define `CORS_ORIGINS` con los dominios del frontend, y compila el frontend con `VITE_API_URL` apuntando al gateway.
5. Ejecuta `pnpm migration:run` y `pnpm seed:users && pnpm seed:products` (el seed de productos sube las 7 imágenes al bucket). En producción crea el administrador con `pnpm seed:admin` y una contraseña segura en lugar de `seed:demo-users`.

## Pruebas

```bash
pnpm test     # vitest
pnpm lint     # oxlint
```
