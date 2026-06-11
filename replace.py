import re

with open('C:/Users/gupta/.gemini/antigravity/scratch/eco-mind/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacements = [
    ('<div class="auth-logo">🌍</div>', '<div class="auth-logo"><i data-lucide="globe"></i></div>'),
    ('<div class="auth-feature-icon">📧</div>', '<div class="auth-feature-icon"><i data-lucide="mail"></i></div>'),
    ('<div class="auth-feature-icon">🤖</div>', '<div class="auth-feature-icon"><i data-lucide="bot"></i></div>'),
    ('<div class="auth-feature-icon">🗺️</div>', '<div class="auth-feature-icon"><i data-lucide="map"></i></div>'),
    ('<div class="auth-feature-icon">🎯</div>', '<div class="auth-feature-icon"><i data-lucide="target"></i></div>'),
    ('🔍 Try Demo Mode (no sign-in needed)', '<i data-lucide="search"></i> Try Demo Mode (no sign-in needed)'),
    ('<span class="topnav-brand-icon" aria-hidden="true">🌍</span>', '<span class="topnav-brand-icon" aria-hidden="true"><i data-lucide="leaf"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">🏠</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="home"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">✏️</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="pen-tool"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">📧</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="mail"></i></span>'),
    ('<span class="nav-icon" aria-hidden=\"true\">📸</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="camera"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">🗺️</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="map"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">🎯</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="target"></i></span>'),
    ('<span class="nav-icon" aria-hidden="true">⚙️</span>', '<span class="nav-icon" aria-hidden="true"><i data-lucide="settings"></i></span>'),
    ('<span aria-hidden="true">🤖</span>', '<span aria-hidden="true"><i data-lucide="bot"></i></span>'),
    ('<span id="streak-days">0</span> 🔥', '<span id="streak-days">0</span> <i data-lucide="flame" style="color:var(--warning); display:inline-block; vertical-align:middle"></i>'),
    ('<span aria-hidden="true">📊</span>', '<span aria-hidden="true"><i data-lucide="bar-chart-2"></i></span>'),
    ('<span aria-hidden="true">📅</span>', '<span aria-hidden="true"><i data-lucide="calendar"></i></span>'),
    ('<span aria-hidden="true">🍩</span>', '<span aria-hidden="true"><i data-lucide="pie-chart"></i></span>'),
    ('id="tab-transport\">🚗 Transport</button>', 'id="tab-transport"><i data-lucide="car"></i> Transport</button>'),
    ('id="tab-food">🍔 Food</button>', 'id="tab-food"><i data-lucide="pizza"></i> Food</button>'),
    ('id="tab-appliance">💡 Home</button>', 'id="tab-appliance"><i data-lucide="lightbulb"></i> Home</button>'),
    ('id="tab-digital">📱 Digital</button>', 'id="tab-digital"><i data-lucide="smartphone"></i> Digital</button>'),
    ('id="tab-flight">✈️ Flight</button>', 'id="tab-flight"><i data-lucide="plane"></i> Flight</button>'),
    ('<h2 class="card-title">🚗 Log a Trip</h2>', '<h2 class="card-title"><i data-lucide="car"></i> Log a Trip</h2>'),
    ('<h2 class="card-title">🍔 Log Food Delivery</h2>', '<h2 class="card-title"><i data-lucide="pizza"></i> Log Food Delivery</h2>'),
    ('<h2 class="card-title">💡 Log Appliance Usage</h2>', '<h2 class="card-title"><i data-lucide="lightbulb"></i> Log Appliance Usage</h2>'),
    ('<h2 class="card-title">📱 Log Screen Time / Digital Activity</h2>', '<h2 class="card-title"><i data-lucide="smartphone"></i> Log Screen Time / Digital Activity</h2>'),
    ('<h2 class="card-title">✈️ Log a Flight</h2>', '<h2 class="card-title"><i data-lucide="plane"></i> Log a Flight</h2>'),
    ('<h1 class="page-title\">📧 Email Carbon Sync</h1>', '<h1 class="page-title"><i data-lucide="mail"></i> Email Carbon Sync</h1>'),
    ('<div class="sync-empty-icon">📧</div>', '<div class="sync-empty-icon"><i data-lucide="mail"></i></div>'),
    ('<h1 class="page-title">📸 Snap &amp; Scan</h1>', '<h1 class="page-title"><i data-lucide="camera"></i> Snap &amp; Scan</h1>'),
    ('🧾 Shopping Receipt</button>', '<i data-lucide="receipt"></i> Shopping Receipt</button>'),
    ('⚡ Electricity Bill</button>', '<i data-lucide="zap"></i> Electricity Bill</button>'),
    ('<div class="scan-dropzone-icon" aria-hidden="true">📷</div>', '<div class="scan-dropzone-icon" aria-hidden="true"><i data-lucide="camera"></i></div>'),
    ('<h1 class="page-title">🗺️ Route Carbon Calculator</h1>', '<h1 class="page-title"><i data-lucide="map"></i> Route Carbon Calculator</h1>'),
    ('<h1 class="page-title">🎯 My Carbon Goals</h1>', '<h1 class="page-title"><i data-lucide="target"></i> My Carbon Goals</h1>'),
    ('<h1 class="page-title">⚙️ Settings</h1>', '<h1 class="page-title"><i data-lucide="settings"></i> Settings</h1>'),
    ('🗑 Clear All Carbon Data</button>', '<i data-lucide="trash-2"></i> Clear All Carbon Data</button>'),
    ('🗑</button>', '<i data-lucide="trash-2"></i></button>')
]

for old_str, new_str in replacements:
    html = html.replace(old_str, new_str)

with open('C:/Users/gupta/.gemini/antigravity/scratch/eco-mind/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Replaced emojis with Lucide icons in index.html")
