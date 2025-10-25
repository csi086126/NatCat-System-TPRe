import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path') || ''
    
    // Fetch from OasisUI
    const oasisUrl = `http://localhost:8080${path}`
    const response = await fetch(oasisUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    let content = await response.text()
    const contentType = response.headers.get('content-type') || ''

    // Only inject CSS for HTML responses
    if (contentType.includes('text/html')) {
      // Inject Taiping theme CSS before </head>
      const taipingThemeCSS = `
<style id="taiping-theme">
/* ==========================================
   Taiping Insurance Group Theme Override
   Blue-Teal Color Scheme
   ========================================== */

/* Primary Red Backgrounds -> Blue-Teal Gradient */
.bg-red-500, .bg-red-600, .bg-red-700,
.bg-danger, .btn-danger, .badge-danger,
.bg-primary, .alert-danger {
  background: linear-gradient(135deg, #0284c7 0%, #14b8a6 100%) !important;
  border-color: #0ea5e9 !important;
}

/* Buttons - Red -> Blue-Teal */
button.btn-primary, .btn-danger,
.ant-btn-primary, .ant-btn-danger,
.MuiButton-containedPrimary,
button[type="submit"],
.btn.btn-primary {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  border-color: #0ea5e9 !important;
  color: white !important;
}

button.btn-primary:hover, .btn-danger:hover,
.ant-btn-primary:hover, .ant-btn-danger:hover,
.MuiButton-containedPrimary:hover {
  background: linear-gradient(135deg, #0369a1, #0f766e) !important;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3) !important;
}

/* Text Colors - Red -> Teal */
.text-red-500, .text-red-600, .text-red-700,
.text-danger, .text-primary {
  color: #14b8a6 !important;
}

/* Links */
a:not(.btn), .link, .ant-anchor-link-title {
  color: #0ea5e9 !important;
}

a:not(.btn):hover, .link:hover {
  color: #0284c7 !important;
  text-decoration: underline;
}

/* Borders - Red -> Teal */
.border-red-500, .border-red-600,
.border-danger, .border-primary {
  border-color: #5eead4 !important;
}

/* Light Backgrounds */
.bg-red-50, .bg-red-100, .bg-danger-light {
  background: linear-gradient(135deg, #f0f9ff, #f0fdfa) !important;
}

/* Navigation & Headers */
.navbar, .header, 
.ant-layout-header,
nav[class*="navbar"],
header[class*="header"] {
  background: linear-gradient(90deg, #0369a1, #0f766e) !important;
}

/* Cards & Panels */
.card-header.bg-danger, .card-header.bg-primary,
.panel-heading.bg-danger {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  color: white !important;
}

/* Progress Bars */
.progress-bar.bg-danger, .progress-bar.bg-primary,
.ant-progress-bg {
  background: linear-gradient(90deg, #0284c7, #14b8a6) !important;
}

/* Badges & Tags */
.badge-danger, .badge-primary,
.ant-badge-status-error, .ant-tag-error {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  border-color: #0ea5e9 !important;
  color: white !important;
}

/* Alerts */
.alert-danger, .ant-alert-error {
  background: linear-gradient(135deg, #dbeafe, #ccfbf1) !important;
  border-color: #5eead4 !important;
  color: #0f766e !important;
}

/* Form Controls Focus */
input:focus, select:focus, textarea:focus,
.form-control:focus, .ant-input:focus,
.ant-select-focused .ant-select-selector {
  border-color: #14b8a6 !important;
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2) !important;
}

/* Active States */
.active, .ant-menu-item-selected,
.nav-link.active {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  color: white !important;
}

/* Tables */
.table-danger, tr.table-danger {
  background: linear-gradient(135deg, #f0f9ff, #f0fdfa) !important;
}

/* Switches & Checkboxes */
.ant-switch-checked,
input[type="checkbox"]:checked {
  background-color: #14b8a6 !important;
  border-color: #14b8a6 !important;
}

/* Spinners & Loaders */
.spinner-border.text-danger,
.ant-spin-dot-item {
  background-color: #14b8a6 !important;
}

/* Oasis Logo Override (if SVG) */
svg[class*="logo"] path[fill*="red"],
svg[class*="logo"] path[fill*="#e"] {
  fill: #14b8a6 !important;
}

/* Top Banner/Notification Bars */
.alert-banner, .notification-bar,
.top-bar {
  background: linear-gradient(90deg, #0369a1, #0f766e) !important;
  color: white !important;
}

/* Dropdown Menus */
.dropdown-item:active,
.ant-dropdown-menu-item-selected {
  background: linear-gradient(135deg, #dbeafe, #ccfbf1) !important;
  color: #0f766e !important;
}

/* Material-UI Specific */
.MuiChip-colorPrimary,
.MuiChip-colorError {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  color: white !important;
}

/* Status Indicators */
.status-active, .status-running,
.indicator-active {
  color: #14b8a6 !important;
}

/* Scrollbar (Webkit) */
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #0284c7, #14b8a6) !important;
}

/* React-Bootstrap Specific */
.btn-outline-danger, .btn-outline-primary {
  color: #14b8a6 !important;
  border-color: #14b8a6 !important;
}

.btn-outline-danger:hover, .btn-outline-primary:hover {
  background: linear-gradient(135deg, #0284c7, #14b8a6) !important;
  color: white !important;
}

/* Additional Specificity for Stubborn Elements */
[class*="red"], [class*="danger"], [class*="error"] {
  /* Use !important sparingly but necessary for overrides */
}

/* Chart/Graph Colors (if using Chart.js or similar) */
.chart-red, .chart-danger {
  background-color: #14b8a6 !important;
  border-color: #0ea5e9 !important;
}
</style>
`
      
      // Inject before closing </head> tag
      if (content.includes('</head>')) {
        content = content.replace('</head>', `${taipingThemeCSS}</head>`)
      } else {
        // If no </head>, inject at the beginning of <body>
        content = content.replace('<body>', `<body>${taipingThemeCSS}`)
      }

      // Also inject a script to continuously monitor and apply theme to dynamically loaded content
      const monitorScript = `
<script id="taiping-theme-monitor">
(function() {
  console.log('🎨 Taiping Theme Active');
  
  // Monitor for dynamically loaded red elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Apply theme to newly added elements
          applyThemeToElement(node);
        }
      });
    });
  });
  
  function applyThemeToElement(element) {
    // Check for red background classes
    if (element.classList) {
      const redClasses = ['bg-red-500', 'bg-red-600', 'bg-danger', 'btn-danger', 'text-red-500'];
      redClasses.forEach(cls => {
        if (element.classList.contains(cls)) {
          element.style.background = 'linear-gradient(135deg, #0284c7, #14b8a6)';
          element.style.borderColor = '#0ea5e9';
        }
      });
    }
    
    // Recursively apply to children
    if (element.children) {
      Array.from(element.children).forEach(applyThemeToElement);
    }
  }
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Initial application to existing elements
  applyThemeToElement(document.body);
})();
</script>
`
      
      // Inject monitoring script before </body>
      if (content.includes('</body>')) {
        content = content.replace('</body>', `${monitorScript}</body>`)
      }
    }

    // Return modified content with proper headers
    return new NextResponse(content, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to proxy OasisUI' },
      { status: 500 }
    )
  }
}
