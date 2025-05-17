@echo off
setlocal

REM Set your Docker Hub username here
set DOCKER_USER=bielefeldj

REM Get the current git short hash
FOR /F "delims=" %%i IN ('git rev-parse --short HEAD') DO set GIT_HASH=%%i

REM Build and push multi-arch image with git hash as version
docker buildx build --platform=linux/amd64,linux/arm64 ^
  --build-arg GIT_HASH=%GIT_HASH% ^
  -t %DOCKER_USER%/hanasuai:latest ^
  --push .

IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker build and push failed!
    exit /b %ERRORLEVEL%
) ELSE (
    echo Build and push complete!
)

pause