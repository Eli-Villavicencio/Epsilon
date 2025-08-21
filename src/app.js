const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const investmentRoutes = require('./routes/investments');
const marketRoutes = require('./routes/market');
const { connectToDatabase, sequelize } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files - SOLO desde /public/
app.use(express.static(path.join(__dirname, '../public')));

// URLs disponibles:
// http://localhost:3000/                    → index.html
// http://localhost:3000/register.html      → register.html  
// http://localhost:3000/login.html         → login.html
// http://localhost:3000/dashboard.html     → dashboard.html
// http://localhost:3000/buy-stocks.html    → buy-stocks.html
// http://localhost:3000/manage-investments.html → manage-investments.html
// http://localhost:3000/market.html        → market.html

// Database connection and sync
connectToDatabase().then(async () => {
    try {
        await sequelize.sync({ force: false });
        console.log('Database tables created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
});

// API Routes - todas las rutas de API tienen el prefijo /api/
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/market', marketRoutes);

// News API endpoint
app.get('/api/news', async (req, res) => {
    try {
        console.log('Fetching financial news...');
        const response = await fetch('https://finnhub.io/api/v1/news?category=general&token=d2f2qkpr01qj3egqt150d2f2qkpr01qj3egqt15g');
        const data = await response.json();
        
        // Limit to 10 most recent news and format data
        const limitedData = data.slice(0, 10).map(news => ({
            id: news.id,
            headline: news.headline,
            summary: news.summary || 'Sin descripción disponible.',
            image: news.image,
            url: news.url,
            source: news.source,
            datetime: news.datetime,
            category: news.category
        }));
        
        res.json({
            success: true,
            data: limitedData,
            message: 'Noticias financieras obtenidas exitosamente'
        });
        
    } catch (error) {
        console.error('Error fetching news:', error);
        
        // Fallback with simulated news if API fails
        const simulatedNews = [
            {
                id: 1,
                headline: "Mercados Globales Muestran Tendencia Alcista en el Tercer Trimestre",
                summary: "Los principales índices bursátiles continúan su racha positiva impulsados por datos económicos favorables y optimismo empresarial.",
                image: "https://via.placeholder.com/300x200?text=Financial+News",
                url: "#",
                source: "Financial Times",
                datetime: Date.now() / 1000,
                category: "market"
            },
            {
                id: 2,
                headline: "Tecnológicas Lideran las Ganancias Semanales en Wall Street",
                summary: "Apple, Microsoft y Google registran aumentos significativos tras reportes de earnings superiores a las expectativas.",
                image: "https://via.placeholder.com/300x200?text=Tech+Stocks",
                url: "#",
                source: "Bloomberg",
                datetime: Date.now() / 1000 - 3600,
                category: "technology"
            },
            {
                id: 3,
                headline: "Inversores se Preparan para la Temporada de Reportes Trimestrales",
                summary: "Analistas predicen resultados mixtos para el S&P 500 mientras las empresas publican sus estados financieros del último trimestre.",
                image: "https://via.placeholder.com/300x200?text=Earnings+Season",
                url: "#",
                source: "Reuters",
                datetime: Date.now() / 1000 - 7200,
                category: "earnings"
            },
            {
                id: 4,
                headline: "Criptomonedas Registran Volatilidad Tras Decisiones Regulatorias",
                summary: "Bitcoin y Ethereum experimentan fluctuaciones significativas después de nuevas regulaciones anunciadas por autoridades financieras.",
                image: "https://via.placeholder.com/300x200?text=Crypto+News",
                url: "#",
                source: "CoinDesk",
                datetime: Date.now() / 1000 - 10800,
                category: "crypto"
            },
            {
                id: 5,
                headline: "Sector Energético en Foco por Nuevas Políticas Ambientales",
                summary: "Empresas de energía renovable ven aumentos en sus valuaciones tras anuncios de incentivos gubernamentales para tecnologías limpias.",
                image: "https://via.placeholder.com/300x200?text=Energy+Sector",
                url: "#",
                source: "Energy Weekly",
                datetime: Date.now() / 1000 - 14400,
                category: "energy"
            }
        ];
        
        res.json({
            success: true,
            data: simulatedNews,
            message: 'Mostrando noticias simuladas (API externa no disponible)'
        });
    }
});

// Web Routes - páginas HTML servidas desde /public/
app.get('/', (req, res) => {
    res.redirect('/register.html');
});

// Rutas específicas para páginas principales (opcional, para mejor SEO)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/buy-stocks', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/buy-stocks.html'));
});

app.get('/manage-investments', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/manage-investments.html'));
});

app.get('/market', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/market.html'));
});

// Catch-all for API routes not found
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Catch-all para rutas web no encontradas - redirigir a página principal
app.get('*', (req, res) => {
    res.redirect('/register.html');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Web pages: http://localhost:${PORT}/`);
    console.log(`API routes: http://localhost:${PORT}/api/`);
});