# Script para descargar imágenes de CIOR
# Ejecutar desde la raíz del proyecto

# Logo footer
Invoke-WebRequest -Uri "https://www.ciorimagenes.com.ar/wp-content/uploads/2019/08/logo-footer.png" -OutFile "public/images/logo/logo-footer.png"

# Imagen equipo médico
Invoke-WebRequest -Uri "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/equipo-medico.png" -OutFile "public/images/team/equipo-medico-original.png"

Write-Host "Imágenes descargadas exitosamente!" -ForegroundColor Green
