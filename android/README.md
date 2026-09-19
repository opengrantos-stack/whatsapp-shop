# GC-AngGlobal Android

Primeira versão Android da GC-AngGlobal usando o site oficial como interface.

- App ID: `ao.geracaocalueio.gcangglobal`
- Nome: `GC-AngGlobal`
- URL: `https://gc-angglobal.geracaocalueio.ao/`
- Target SDK: 36
- Version: 1.0.0 (code 1)

## Gerar AAB

Com Android SDK instalado e Gradle 8.13+:

```bash
gradle wrapper --gradle-version 8.13
./gradlew bundleRelease
```

O AAB será criado em:

`app/build/outputs/bundle/release/app-release.aab`

## Observação

Esta versão já trata JavaScript, armazenamento local/cookies e seleção de ficheiros para as funções de imagem da plataforma. O próximo passo é testar no TECNO Spark 30 antes da publicação.
