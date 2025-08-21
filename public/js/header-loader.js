class HeaderLoader {
    constructor() {
        this.headerLoaded = false;
        this.initAttempts = 0;
        this.maxInitAttempts = 5;
        this.init();
    }

    async init() {
        // Only load header on authenticated pages
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.log('No userId found, skipping header load');
            return;
        }

        // Skip loading on login/register pages
        const currentPage = window.location.pathname.split('/').pop();
        const skipPages = ['login.html', 'register.html', 'forgot-password.html', 'reset-password.html', 'index.html'];
        
        if (skipPages.includes(currentPage)) {
            console.log('Skipping header load for page:', currentPage);
            return;
        }

        console.log('Loading header for authenticated user...');
        await this.loadHeader();
    }

    async loadHeader() {
        try {
            console.log('Fetching header HTML...');
            const response = await fetch('./components/header.html');
            const headerHTML = await response.text();
            
            // Create header container if it doesn't exist
            let headerContainer = document.getElementById('global-header-container');
            if (!headerContainer) {
                headerContainer = document.createElement('div');
                headerContainer.id = 'global-header-container';
                document.body.insertBefore(headerContainer, document.body.firstChild);
            }
            
            headerContainer.innerHTML = headerHTML;
            this.headerLoaded = true;
            console.log('Header HTML loaded successfully');

            // Adjust body padding to account for fixed header
            document.body.style.paddingTop = '0px';
            
            // Forzar inicialización del header después de cargar HTML
            this.initializeHeaderWithRetry();
            
        } catch (error) {
            console.error('Error loading header:', error);
        }
    }

    initializeHeaderWithRetry() {
        const tryInitialize = () => {
            this.initAttempts++;
            console.log(`Attempting to initialize header (attempt ${this.initAttempts})`);
            
            // Verificar que los elementos existan en el DOM
            const headerUserName = document.getElementById('headerUserName');
            const headerCashBalance = document.getElementById('headerCashBalance');
            
            if (headerUserName && headerCashBalance) {
                console.log('Header elements found, initializing...');
                
                // Llamar función de inicialización si existe
                if (typeof initializeHeader === 'function') {
                    initializeHeader();
                } else {
                    // Si la función no existe, inicializar directamente
                    this.directInitialize();
                }
                
                // También cargar balance inmediatamente
                if (typeof loadHeaderCashBalance === 'function') {
                    loadHeaderCashBalance();
                } else {
                    this.loadCashBalanceDirect();
                }
            } else {
                console.log('Header elements not found yet, retrying...');
                if (this.initAttempts < this.maxInitAttempts) {
                    setTimeout(tryInitialize, 300);
                } else {
                    console.error('Failed to find header elements after maximum attempts');
                }
            }
        };
        
        // Iniciar el primer intento inmediatamente
        setTimeout(tryInitialize, 100);
    }

    directInitialize() {
        console.log('Direct header initialization...');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        // Actualizar nombre del usuario
        const headerUserName = document.getElementById('headerUserName');
        if (headerUserName) {
            const displayName = user.firstName || user.username || user.email || 'Usuario';
            headerUserName.textContent = displayName;
            console.log('User name set to:', displayName);
        }
        
        // Cargar balance de efectivo
        this.loadCashBalanceDirect();
        
        // Set active nav item
        this.setActiveNavItem();
    }

    async loadCashBalanceDirect() {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            console.log('No userId found for cash balance');
            return;
        }
        
        try {
            console.log('Loading cash balance directly for user:', userId);
            const response = await fetch('/api/investments/cash/balance', {
                headers: { 'x-user-id': userId }
            });
            const result = await response.json();
            
            console.log('Cash balance response:', result);
            
            if (result.success) {
                const balance = parseFloat(result.data.cashBalance) || 0;
                const balanceElement = document.getElementById('headerCashBalance');
                if (balanceElement) {
                    balanceElement.textContent = `$${balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
                    console.log('Balance updated in header:', balance);
                } else {
                    console.error('headerCashBalance element not found');
                }
            } else {
                console.error('Error in balance response:', result.message);
                const balanceElement = document.getElementById('headerCashBalance');
                if (balanceElement) {
                    balanceElement.textContent = '$0.00';
                }
            }
        } catch (error) {
            console.error('Error loading cash balance:', error);
            const balanceElement = document.getElementById('headerCashBalance');
            if (balanceElement) {
                balanceElement.textContent = '$0.00';
            }
        }
    }

    setActiveNavItem() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage || 
                (currentPage === 'index.html' && href === 'dashboard.html')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Method to update cash balance from other components
    updateCashBalance(newBalance) {
        console.log('Updating cash balance to:', newBalance);
        if (this.headerLoaded) {
            if (typeof updateHeaderCashBalance === 'function') {
                updateHeaderCashBalance(newBalance);
            } else {
                // Update directly
                const balanceElement = document.getElementById('headerCashBalance');
                if (balanceElement) {
                    const balance = parseFloat(newBalance) || 0;
                    balanceElement.textContent = `$${balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    })}`;
                    console.log('Balance updated directly:', balance);
                }
            }
        } else {
            // Si el header no está cargado aún, intentar de nuevo
            setTimeout(() => {
                this.updateCashBalance(newBalance);
            }, 500);
        }
    }

    // Method to refresh user info and balance
    refreshUserInfo() {
        if (this.headerLoaded) {
            if (typeof loadHeaderCashBalance === 'function') {
                loadHeaderCashBalance();
            } else {
                this.loadCashBalanceDirect();
            }
            
            if (typeof initializeHeader === 'function') {
                initializeHeader();
            } else {
                this.directInitialize();
            }
        }
    }

    // Method to check if header is properly loaded
    isHeaderReady() {
        return this.headerLoaded && 
               document.getElementById('headerUserName') && 
               document.getElementById('headerCashBalance');
    }
}

// Create global instance
const headerLoader = new HeaderLoader();

// Make it available globally
window.headerLoader = headerLoader;

// Debug function to check header status
window.debugHeader = function() {
    console.log('Header loaded:', headerLoader.headerLoaded);
    console.log('Header ready:', headerLoader.isHeaderReady());
    console.log('UserName element:', document.getElementById('headerUserName'));
    console.log('CashBalance element:', document.getElementById('headerCashBalance'));
    console.log('User data:', localStorage.getItem('user'));
    console.log('User ID:', localStorage.getItem('userId'));
};
