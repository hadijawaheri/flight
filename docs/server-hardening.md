# سخت‌سازی سرور و عملیات

این راهنما کارهایی است که باید یک‌بار روی سرور (Ubuntu، اجرای فعلی با PM2) انجام شود. هر بخش مستقل است. ترتیب پیشنهادی همین ترتیب است.

## ۱. فایروال و بستن پورت‌ها

یک نشست SSH دوم باز نگه دارید تا اگر اشتباهی شد بیرون نمانید، سپس:

```bash
sudo SSH_PORT=22 bash scripts/harden-server.sh   # اگر SSH روی پورت دیگری است، همان را بدهید
```

فقط 22، 80 و 443 از بیرون باز می‌مانند. پورت ۹۸۸۰ و هر پورت دیگری بسته می‌شود. API (۷۷۹۱) و وب (۷۷۹۲) از قبل روی `127.0.0.1` گوش می‌دهند. در پایان، اسکریپت سوکت‌هایی را که روی loopback نیستند نشان می‌دهد. اگر `27017` در این فهرست بود، بخش ۲ را حتماً انجام دهید.

اگر Worker کلودفلر به پورت دیگری (مثلاً ۹۸۸۰) وصل می‌شود، پیش از بستن، `ORIGIN_URL` آن را به `https://<domain>` (بخش ۴) یا `http://<ip>.sslip.io:80` تغییر دهید.

## ۲. کاربر جداگانه و رمزدار برای MongoDB

۱. در `/etc/mongod.conf`:

```yaml
net:
  bindIp: 127.0.0.1
replication:
  replSetName: rs0
security:
  authorization: enabled
  keyFile: /etc/mongod.keyfile
```

۲. ساخت keyfile و کاربرها. **پیش از** فعال کردن `authorization` این کاربرها را بسازید:

```bash
sudo sh -c 'openssl rand -base64 756 > /etc/mongod.keyfile && chmod 400 /etc/mongod.keyfile && chown mongodb:mongodb /etc/mongod.keyfile'
mongosh --eval '
  db.getSiblingDB("admin").createUser({ user: "root", pwd: passwordPrompt(), roles: ["root"] });
  db.getSiblingDB("flysmart").createUser({ user: "flysmart", pwd: passwordPrompt(), roles: [{ role: "readWrite", db: "flysmart" }] });
'
sudo systemctl restart mongod
```

۳. در `apps/api/.env`:

```
DATABASE_URL=mongodb://flysmart:<password>@127.0.0.1:27017/flysmart?replicaSet=rs0&authSource=flysmart
```

سپس `pm2 restart flysmart-api --update-env` و `curl http://127.0.0.1:7791/health/ready`. کاربر `flysmart` فقط به دیتابیس `flysmart` دسترسی دارد. رمز root را جای امنی بیرون از سرور نگه دارید.

## ۳. بکاپ خودکار روزانه

```bash
sudo apt-get install -y mongodb-database-tools   # از مخزن رسمی MongoDB
bash scripts/backup-mongo.sh                       # یک‌بار دستی برای تست
crontab -e
# هر شب ساعت ۳:۳۰ به وقت سرور
30 3 * * * cd /path/to/flight && BACKUP_RCLONE_REMOTE=backup:flysmart bash scripts/backup-mongo.sh >> /var/log/flysmart-backup.log 2>&1
```

- آرشیوها در `/var/backups/flysmart` با دسترسی 600 ذخیره و پس از ۱۴ روز پاک می‌شوند (`BACKUP_KEEP_DAYS`).
- بکاپی که فقط روی همان دیسک باشد، با خراب شدن سرور از بین می‌رود. با `rclone config` یک مقصد بیرونی (مثلاً یک S3 یا Google Drive) بسازید و `BACKUP_RCLONE_REMOTE` را بدهید.
- بازگردانی: `mongorestore --uri "<DATABASE_URL>" --archive=<file> --gzip --drop`. هر چند ماه یک‌بار بازگردانی را روی یک دیتابیس آزمایشی تمرین کنید.

## ۴. دامنه، TLS و هدایت HTTP به HTTPS

۱. رکورد A دامنه را به IP سرور بدهید.
۲. Caddy را با فایل `infra/Caddyfile` و `SITE_ADDRESS=example.com` اجرا کنید (مثلاً `Environment=SITE_ADDRESS=example.com` در `systemctl edit caddy`، سپس `sudo systemctl reload caddy`).
۳. Caddy گواهی را خودش می‌گیرد و تمدید می‌کند و پورت ۸۰ را به ۴۴۳ هدایت می‌کند.
۴. در `apps/api/.env`، دامنه را به `CORS_ORIGINS` اضافه کنید.
۵. اگر Worker را نگه می‌دارید، `ORIGIN_URL` آن را `https://example.com` بگذارید تا مسیر Worker تا سرور هم رمزنگاری شود.

## ۵. PM2: اجرای دائمی و چرخش لاگ

```bash
pm2 startup systemd      # دستوری را که چاپ می‌کند با sudo اجرا کنید
pm2 save
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 30
```

لاگ API حالا JSON با زمان ISO و `x-request-id` است و هدرهای Authorization و Cookie در آن پنهان می‌شوند. برای جمع‌آوری متمرکز، همین فایل‌ها را می‌توان به Grafana Loki یا Better Stack فرستاد.

## ۶. ورود با پیامک واقعی (پس از ادغام PR امنیتی)

در `apps/api/.env`:

```
SMS_PROVIDER=melipayamak
MELIPAYAMAK_API_KEY=<کلید کنسول>
MELIPAYAMAK_OTP_BODY_ID=<شناسه‌ی الگوی تأییدشده با یک متغیر برای کد>
OTP_FIXED_CODE=
ALLOW_DEV_AUTH=false
ALLOW_SIMULATED_PAYMENTS=true
```

سپس `pm2 startOrReload infra/ecosystem.config.cjs --update-env`. اگر کلید یا الگو نادرست باشد، API بالا نمی‌آید یا ورود خطا می‌دهد. پیش از ریستارت، `pm2 logs flysmart-api` را باز نگه دارید.

## ۷. جایگزین: اجرای کامل با Docker

```bash
cp infra/prod.env.example infra/prod.env   # رمزها را پر کنید
docker compose -f infra/docker-compose.prod.yml --env-file infra/prod.env up -d --build
```

Mongo با کاربر جدا و رمزدار، migration، API، وب و Caddy بالا می‌آیند. فقط پورت‌های ۸۰ و ۴۴۳ منتشر می‌شوند. `apps/api/.env` همچنان برای اسرار JWT/OTP و تنظیمات پیامک خوانده می‌شود. این مسیر جایگزین PM2 است، نه همراه آن.

## ۸. شاخه‌ها

- `main`: همان چیزی که روی سرور است. فقط از طریق PR ادغام شود.
- `develop`: کار روزمره. شاخه‌های `feat/*` و `fix/*` از `develop` جدا و به آن ادغام می‌شوند، و برای انتشار PR از `develop` به `main` باز می‌شود.
- CI روی push به `main` و `develop` و روی هر PR اجرا می‌شود.
