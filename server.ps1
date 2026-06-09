$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try {
    $listener.Start()
    Write-Host "Uppsala Hallfördelare Server" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    Write-Host "Server startad framgångsrikt!" -ForegroundColor Green
    Write-Host "Körs på: http://localhost:$port" -ForegroundColor Green
    Write-Host ""
    Write-Host "Håll detta fönster öppet för att hålla servern igång." -ForegroundColor Yellow
    Write-Host "Stäng fönstret för att stoppa servern." -ForegroundColor Yellow
    Start-Process "http://localhost:$port"
} catch {
    Write-Host "FEL: Kunde inte starta servern. Kanske används port $port redan?" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Tryck Enter för att avsluta"
    exit
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        
        $path = $req.Url.LocalPath
        if ($path -eq "/") { $path = "/index.html" }
        
        # Simple directory traversal prevention
        $normalizedPath = $path.Replace("\", "/").TrimStart('/')
        if ($normalizedPath.Contains("..")) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }
        
        $file = Join-Path $PSScriptRoot $normalizedPath
        
        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            
            # Content Type
            if ($file.EndsWith(".html")) { $res.ContentType = "text/html; charset=utf-8" }
            elseif ($file.EndsWith(".js")) { $res.ContentType = "application/javascript; charset=utf-8" }
            elseif ($file.EndsWith(".css")) { $res.ContentType = "text/css; charset=utf-8" }
            
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    } catch {
        # Connection reset or browser cancellation
    }
}
