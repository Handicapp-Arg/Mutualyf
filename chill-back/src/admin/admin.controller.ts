import { Controller, Get, Res, Header } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Página de administración con botón para borrar DB y cookies
   * GET /api/admin
   */
  @Get()
  @Header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'")
  async adminPage(@Res() res: Response) {
    // Obtener estadísticas actuales
    const [totalUsers, totalSessions, totalConversations, totalFeedback] = await Promise.all([
      this.prisma.userIdentity.count(),
      this.prisma.userSession.count(),
      this.prisma.conversation.count(),
      this.prisma.feedback.count(),
    ]);

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🔧 Chill Admin Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 40px 20px;
      color: #e0e0e0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
      font-size: 2.5rem;
      background: linear-gradient(90deg, #00d4ff, #7b2cbf);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,212,255,0.2);
    }
    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      color: #00d4ff;
    }
    .stat-label {
      font-size: 0.9rem;
      color: #888;
      margin-top: 5px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 15px;
      align-items: center;
    }
    button {
      padding: 15px 40px;
      font-size: 1.1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
      width: 100%;
      max-width: 400px;
    }
    .btn-danger {
      background: linear-gradient(135deg, #ff416c, #ff4b2b);
      color: white;
    }
    .btn-danger:hover {
      transform: scale(1.02);
      box-shadow: 0 5px 20px rgba(255,65,108,0.4);
    }
    .btn-warning {
      background: linear-gradient(135deg, #f7971e, #ffd200);
      color: #1a1a2e;
    }
    .btn-warning:hover {
      transform: scale(1.02);
      box-shadow: 0 5px 20px rgba(247,151,30,0.4);
    }
    .btn-info {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
    .btn-info:hover {
      transform: scale(1.02);
      box-shadow: 0 5px 20px rgba(102,126,234,0.4);
    }
    .message {
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
      display: none;
    }
    .message.success {
      background: rgba(0,255,136,0.2);
      border: 1px solid #00ff88;
      color: #00ff88;
    }
    .message.error {
      background: rgba(255,65,108,0.2);
      border: 1px solid #ff416c;
      color: #ff416c;
    }
    .links {
      margin-top: 40px;
      text-align: center;
    }
    .links a {
      color: #00d4ff;
      text-decoration: none;
      margin: 0 15px;
      transition: opacity 0.2s;
    }
    .links a:hover {
      opacity: 0.7;
    }
    .warning-text {
      color: #ff416c;
      font-size: 0.85rem;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Chill Admin Panel</h1>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">${totalUsers}</div>
        <div class="stat-label">👤 Usuarios</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalSessions}</div>
        <div class="stat-label">🔑 Sesiones</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalConversations}</div>
        <div class="stat-label">💬 Conversaciones</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${totalFeedback}</div>
        <div class="stat-label">⭐ Feedback</div>
      </div>
    </div>

    <div id="message" class="message"></div>

    <div class="actions">
      <button class="btn-danger" id="btnResetAll">
        🗑️ BORRAR TODO (DB + Cookies + LocalStorage)
      </button>
      <p class="warning-text">⚠️ Esta acción no se puede deshacer</p>
      
      <button class="btn-warning" id="btnClearBrowser">
        🍪 Solo borrar Cookies y LocalStorage
      </button>
      
      <button class="btn-info" id="btnRefresh">
        🔄 Actualizar estadísticas
      </button>
    </div>

    <div class="links">
      <a href="http://localhost:5555" target="_blank">📊 Prisma Studio</a>
      <a href="http://localhost:5173" target="_blank">🏠 Ir al Chat</a>
      <a href="/api/health" target="_blank">❤️ Health Check</a>
      <a href="/api/stats" target="_blank">📈 Stats JSON</a>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const CHAT_ORIGIN = 'http://localhost:5173';
      
      function showMessage(text, type) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.className = 'message ' + type;
        msg.style.display = 'block';
        setTimeout(function() { msg.style.display = 'none'; }, 5000);
      }

      function clearBrowserData() {
        document.cookie.split(';').forEach(function(c) {
          document.cookie = c.replace(/^ +/, '')
            .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
        });
        
        localStorage.clear();
        sessionStorage.clear();
        
        try {
          if (window.opener) {
            window.opener.localStorage.clear();
            window.opener.sessionStorage.clear();
          }
        } catch(e) {
          console.log('No se pudo acceder al storage del chat directamente');
        }
        
        showMessage('✅ Cookies y LocalStorage borrados. Para borrar del chat, abre F12 y ejecuta: localStorage.clear()', 'success');
      }

      async function resetAll() {
        if (!confirm('⚠️ ¿Estás seguro? Esto borrará TODOS los datos.')) {
          return;
        }
        
        try {
          const response = await fetch('/api/reset-database', {
            method: 'DELETE',
          });
          
          if (!response.ok) {
            throw new Error('Error al borrar la base de datos');
          }
          
          const result = await response.json();
          clearBrowserData();
          showMessage('✅ Base de datos borrada. Recarga el chat.', 'success');
          setTimeout(function() { window.location.reload(); }, 2000);
          
        } catch (error) {
          showMessage('❌ Error: ' + error.message, 'error');
        }
      }

      // Event listeners
      document.getElementById('btnResetAll').addEventListener('click', resetAll);
      document.getElementById('btnClearBrowser').addEventListener('click', clearBrowserData);
      document.getElementById('btnRefresh').addEventListener('click', function() {
        window.location.reload();
      });
    });
  </script>
</body>
</html>
    `;

    res.type('html').send(html);
  }
}
