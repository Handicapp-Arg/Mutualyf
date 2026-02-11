# Script para descargar TODAS las imágenes del sitio CIOR
Write-Host "Descargando imágenes de www.ciorimagenes.com.ar..." -ForegroundColor Cyan

# Crear directorios si no existen
$paths = @(
    "public/images/logo",
    "public/images/team",
    "public/images/technology",
    "public/images/services"
)

foreach ($path in $paths) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

# Descargar logo footer
Write-Host "Descargando logo..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://www.ciorimagenes.com.ar/wp-content/uploads/2019/08/logo-footer.png" -OutFile "public/images/logo/logo-footer.png"

# Descargar imagen equipo médico
Write-Host "Descargando equipo médico..." -ForegroundColor Yellow
Invoke-WebRequest -Uri "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/equipo-medico.png" -OutFile "public/images/team/equipo-medico-original.png"

# Descargar imágenes de tecnología
Write-Host "Descargando imágenes de tecnología..." -ForegroundColor Yellow
$techImages = @{
    "planmeca-promax-3d-classic.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/planmeca-promax-3d-classic.jpg"
    "pmx3d_mid_half.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/pmx3d_mid_half.jpg"
    "5_rxs.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/5_rxs.jpg"
    "pmx83h1_sky_half.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/pmx83h1_sky_half.jpg"
    "vistascan_mini_eindruecken_ddrw.png" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/vistascan_mini_eindruecken_ddrw.png"
    "nemoceph-2d.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/nemoceph-2d.jpg"
    "nemoscan-screenshot.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/nemoscan-screenshot.jpg"
    "3DPrinters.png" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/3DPrinters.png"
    "planmeca-emerald-s.jpg" = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/planmeca-emerald-s.jpg"
}

foreach ($img in $techImages.GetEnumerator()) {
    Write-Host "  - $($img.Key)" -ForegroundColor Gray
    Invoke-WebRequest -Uri $img.Value -OutFile "public/images/technology/$($img.Key)"
}

# Descargar imágenes de servicios
Write-Host "Descargando imágenes de servicios..." -ForegroundColor Yellow
for ($i = 1; $i -le 9; $i++) {
    $fileName = "servicio0$i.jpg"
    $url = "https://www.ciorimagenes.com.ar/wp-content/uploads/2016/12/$fileName"
    Write-Host "  - $fileName" -ForegroundColor Gray
    Invoke-WebRequest -Uri $url -OutFile "public/images/services/$fileName"
}

Write-Host ""
Write-Host "✓ Logo: 1 imagen" -ForegroundColor Green
Write-Host "✓ Equipo médico: 1 imagen" -ForegroundColor Green
Write-Host "✓ Tecnología: 9 imágenes" -ForegroundColor Green
Write-Host "✓ Servicios: 9 imágenes" -ForegroundColor Green
Write-Host ""
Write-Host "Total: 20 imágenes descargadas exitosamente!" -ForegroundColor Cyan
