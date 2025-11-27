# Create .cert directory if it doesn't exist
$certDir = ".cert"
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Generate private key and self-signed certificate
$cert = New-SelfSignedCertificate \
    -Subject "localhost" \
    -DnsName "localhost" \
    -KeyAlgorithm RSA \
    -KeyLength 2048 \
    -NotBefore (Get-Date) \
    -NotAfter (Get-Date).AddYears(1) \
    -CertStoreLocation "cert:\CurrentUser\My" \
    -FriendlyName "RAVR Development Certificate" \
    -HashAlgorithm SHA256 \
    -KeyUsage DigitalSignature, KeyEncipherment, DataEncipherment \
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

# Export the certificate and private key
$pwd = ConvertTo-SecureString -String "RAVR-dev-cert" -Force -AsPlainText
$certPath = Join-Path -Path $certDir -ChildPath "cert.pem"
$keyPath = Join-Path -Path $certDir -ChildPath "key.pem"

# Export certificate
Export-PfxCertificate -Cert $cert -FilePath (Join-Path -Path $certDir -ChildPath "cert.pfx") -Password $pwd | Out-Null

# Export certificate and private key in PEM format
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store [System.Security.Cryptography.X509Certificates.StoreName]::My, [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)
$cert = $store.Certificates | Where-Object { $_.Subject -eq "CN=localhost" } | Select-Object -First 1

# Export certificate in PEM format
$cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert) | Set-Content -Path $certPath -Encoding Byte

# Export private key in PEM format
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$privateKeyBytes = $rsa.ExportPkcs8PrivateKey()
[System.Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) | 
    Out-File -FilePath $keyPath -Encoding ascii

Write-Host "Certificate generated successfully!" -ForegroundColor Green
Write-Host "Certificate path: $certPath"
Write-Host "Private key path: $keyPath"

# Add certificate to trusted root (requires admin privileges)
$rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store "Root", "LocalMachine"
$rootStore.Open("ReadWrite")
$rootStore.Add($cert)
$rootStore.Close()

Write-Host "Certificate added to trusted root store" -ForegroundColor Green
