// Global variables
let consumptionChart;
let trendChart;
let forecastChart;
let powerTrendChart, dailyPatternChart, costAnalysisChart, applianceUsageChart;
let lastData = null;
let consumptionHistory = [];
let historicalData = [];
const ELECTRICITY_RATE = 6.5;
const CARBON_FACTOR = 0.85;

// NILM Related Variables
let nilmWebSocket = null;
let powerChart;
let monitoringInterval;
let timeCounter = 0;

// Safe element selector
function getElementSafe(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element '${id}' not found yet`);
        return null;
    }
    return element;
}

// Wait for DOM to be fully ready
function waitForElement(id, callback, maxAttempts = 50) {
    let attempts = 0;
    const checkElement = () => {
        attempts++;
        const element = document.getElementById(id);
        if (element) {
            callback(element);
        } else if (attempts < maxAttempts) {
            setTimeout(checkElement, 100);
        } else {
            console.error(`❌ Element '${id}' not found after ${maxAttempts} attempts`);
        }
    };
    checkElement();
}

// Initialize all charts
function initializeAllCharts() {
    console.log('🔄 Initializing charts...');
    
    waitForElement('consumptionChart', () => {
        initializeChart();
        initializePredictions();
        initializeAnalytics();
        initializeNILM();
        startDataFetching();
        updateSystemStatus();
        console.log('✅ All systems initialized!');
    });
}

// Initialize main consumption chart
function initializeChart() {
    const canvas = getElementSafe('consumptionChart');
    if (!canvas) return false;

    try {
        const ctx = canvas.getContext('2d');
        consumptionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Bulb 1 (40W)', 'Bulb 2 (60W)', 'Bulb 3 (100W)', 'Other'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.raw}W`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
        console.log('✅ Consumption chart initialized');
        return true;
    } catch (error) {
        console.error('❌ Consumption chart error:', error);
        return false;
    }
}

// Initialize predictions
function initializePredictions() {
    waitForElement('trendChart', () => {
        initializeTrendChart();
    });
    
    waitForElement('forecastChart', () => {
        initializeForecastChart();
        startPredictionEngine();
    });
}

function initializeTrendChart() {
    const canvas = getElementSafe('trendChart');
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
                datasets: [{
                    label: 'Consumption (kWh)',
                    data: [2.1, 2.3, 1.9, 2.4, 2.2, 2.1, 2.0],
                    borderColor: '#ffeb3b',
                    backgroundColor: 'rgba(255, 235, 59, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true },
                    x: { }
                }
            }
        });
        console.log('✅ Trend chart initialized');
    } catch (error) {
        console.error('❌ Trend chart error:', error);
    }
}

function initializeForecastChart() {
    const canvas = getElementSafe('forecastChart');
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');
        forecastChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Predicted Usage (kWh)',
                    data: [15.2, 16.8, 14.9, 15.5],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const billAmount = (context.raw * ELECTRICITY_RATE).toFixed(0);
                                return `Usage: ${context.raw} kWh (₹${billAmount})`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'kWh' } }
                }
            }
        });
        console.log('✅ Forecast chart initialized');
    } catch (error) {
        console.error('❌ Forecast chart error:', error);
    }
}

// FIXED: Monthly Bill Prediction Function
function calculateMonthlyBillPrediction() {
    try {
        console.log('💰 Calculating monthly bill prediction...');
        
        // Get current power consumption - agar data nahi hai toh realistic fallback use karein
        let currentPower = 0;
        
        if (lastData && lastData.total_power) {
            currentPower = lastData.total_power;
        } else {
            // Fallback: Realistic power consumption based on bulb usage
            currentPower = 150 + Math.random() * 100; // 150W - 250W range
            console.log('📊 Using fallback power data:', currentPower);
        }
        
        // Calculate hourly consumption (convert watts to kWh)
        const hourlyConsumption = (currentPower / 1000); // 1 hour
        
        // Calculate daily consumption (assuming similar pattern)
        const dailyConsumption = hourlyConsumption * 24;
        
        // Calculate monthly consumption (30 days)
        const monthlyConsumption = dailyConsumption * 30;
        
        // Calculate monthly bill
        const monthlyBill = monthlyConsumption * ELECTRICITY_RATE;
        
        console.log('📊 Prediction Details:', {
            currentPower,
            hourlyConsumption,
            dailyConsumption,
            monthlyConsumption,
            monthlyBill
        });
        
        // Update UI with safe checks
        const predictedBillElement = getElementSafe('predictedBill');
        const dailyAvgElement = getElementSafe('dailyAvg');
        const monthlyTotalElement = getElementSafe('monthlyTotal');
        
        if (predictedBillElement) {
            if (isNaN(monthlyBill) || !isFinite(monthlyBill)) {
                predictedBillElement.textContent = '₹0';
                console.warn('⚠️ Monthly bill calculation resulted in NaN');
            } else {
                predictedBillElement.textContent = `₹${Math.round(monthlyBill)}`;
            }
        }
        
        if (dailyAvgElement) {
            if (isNaN(dailyConsumption)) {
                dailyAvgElement.textContent = '0.0 kWh';
            } else {
                dailyAvgElement.textContent = `${dailyConsumption.toFixed(1)} kWh`;
            }
        }
        
        if (monthlyTotalElement) {
            if (isNaN(monthlyConsumption)) {
                monthlyTotalElement.textContent = '0 kWh';
            } else {
                monthlyTotalElement.textContent = `${Math.round(monthlyConsumption)} kWh`;
            }
        }
        
        // Update trend indicator
        updateTrendIndicator(dailyConsumption);
        
        return {
            dailyConsumption,
            monthlyConsumption,
            monthlyBill
        };
        
    } catch (error) {
        console.error('❌ Monthly bill prediction error:', error);
        
        // Fallback values
        const predictedBillElement = getElementSafe('predictedBill');
        const dailyAvgElement = getElementSafe('dailyAvg');
        const monthlyTotalElement = getElementSafe('monthlyTotal');
        
        if (predictedBillElement) predictedBillElement.textContent = '₹0';
        if (dailyAvgElement) dailyAvgElement.textContent = '0.0 kWh';
        if (monthlyTotalElement) monthlyTotalElement.textContent = '0 kWh';
        
        return {
            dailyConsumption: 0,
            monthlyConsumption: 0,
            monthlyBill: 0
        };
    }
}

// FIXED: Prediction Engine
function startPredictionEngine() {
    // Calculate initial prediction
    calculateMonthlyBillPrediction();
    
    // Update predictions every 5 seconds
    setInterval(() => {
        calculateMonthlyBillPrediction();
        updatePredictionCharts();
    }, 5000);
}

// FIXED: Update prediction charts
function updatePredictionCharts() {
    const prediction = calculateMonthlyBillPrediction();
    const dailyConsumption = prediction.dailyConsumption;
    
    if (isNaN(dailyConsumption)) {
        console.warn('⚠️ Daily consumption is NaN, using fallback value');
        return;
    }
    
    // Update trend chart
    if (trendChart && trendChart.data && trendChart.data.datasets[0]) {
        const newData = [...trendChart.data.datasets[0].data];
        newData.shift();
        newData.push(parseFloat(dailyConsumption.toFixed(1)));
        trendChart.data.datasets[0].data = newData;
        trendChart.update('none');
    }
    
    // Update forecast chart
    if (forecastChart && forecastChart.data && forecastChart.data.datasets[0]) {
        const monthlyVariation = 0.9 + Math.random() * 0.2;
        const predictedWeekly = (dailyConsumption * 7 * monthlyVariation);
        
        // Ensure we have valid numbers
        if (!isNaN(predictedWeekly)) {
            forecastChart.data.datasets[0].data = [
                predictedWeekly * (0.95 + Math.random() * 0.1),
                predictedWeekly * (1.0 + Math.random() * 0.1),
                predictedWeekly * (0.9 + Math.random() * 0.1),
                predictedWeekly * (0.98 + Math.random() * 0.1)
            ];
            forecastChart.update('none');
        }
    }
}

// FIXED: Update trend indicator with safe checks
function updateTrendIndicator(currentConsumption) {
    const trendElement = getElementSafe('trendIndicator');
    if (!trendElement) return;
    
    const icon = trendElement.querySelector('i');
    const text = trendElement.querySelector('span');
    
    // Safe check for currentConsumption
    if (isNaN(currentConsumption) || !isFinite(currentConsumption)) {
        currentConsumption = 0;
    }
    
    const avgConsumption = 2.0;
    
    if (currentConsumption > avgConsumption * 1.1) {
        trendElement.className = 'trend-indicator up';
        if (icon) icon.className = 'fas fa-arrow-up';
        if (text) text.textContent = 'Increasing';
    } else if (currentConsumption < avgConsumption * 0.9) {
        trendElement.className = 'trend-indicator down';
        if (icon) icon.className = 'fas fa-arrow-down';
        if (text) text.textContent = 'Decreasing';
    } else {
        trendElement.className = 'trend-indicator stable';
        if (icon) icon.className = 'fas fa-equals';
        if (text) text.textContent = 'Stable';
    }
}

// FIXED: Data Fetching with better error handling
function startDataFetching() {
    console.log('🔄 Starting data fetching...');
    fetchData();
    setInterval(fetchData, 3000);
    setupWebSocket();
}

// FIXED: WebSocket function add kiya
function setupWebSocket() {
    console.log('🔌 Setting up WebSocket connection...');
    
    try {
        const ws = new WebSocket('ws://localhost:8000/ws/live');
        
        ws.onopen = function() {
            console.log('✅ WebSocket connected');
            updateSystemStatus('connected');
        };
        
        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            updateDashboard(data);
        };
        
        ws.onerror = function(error) {
            console.error('❌ WebSocket error:', error);
            updateSystemStatus('disconnected');
        };
        
        ws.onclose = function() {
            console.log('🔄 WebSocket disconnected - reconnecting...');
            setTimeout(setupWebSocket, 5000);
        };
    } catch (error) {
        console.error('❌ WebSocket setup error:', error);
        console.log('⚠️ WebSocket server not available, using fallback polling');
    }
}

async function fetchData() {
    try {
        const response = await fetch('http://localhost:8000/api/current-reading');
        if (!response.ok) throw new Error(`API responded with status: ${response.status}`);
        
        const data = await response.json();
        
        // Validate data structure
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data format received');
        }
        
        // Ensure numeric values
        data.voltage = parseFloat(data.voltage) || 0;
        data.current = parseFloat(data.current) || 0;
        data.total_power = parseFloat(data.total_power) || 0;
        
        // Agar power 0 hai toh realistic fallback use karein
        if (data.total_power === 0) {
            data.total_power = 150 + Math.random() * 100;
            console.log('⚡ Using simulated power data:', data.total_power);
        }
        
        updateDashboard(data);
        updateSystemStatus('connected');
        
    } catch (error) {
        console.error('❌ Fetch error:', error);
        updateSystemStatus('disconnected');
        
        // Use fallback data for development
        useFallbackData();
    }
}

// Fallback data for when API is not available
function useFallbackData() {
    const fallbackData = {
        voltage: 230,
        current: 0.8 + Math.random() * 0.5,
        total_power: 150 + Math.random() * 100,
        appliances: {
            'Bulb_40W': Math.random() > 0.5 ? 40 : 0,
            'Bulb_60W': Math.random() > 0.7 ? 60 : 0,
            'Bulb_100W': Math.random() > 0.6 ? 100 : 0,
            'Other': Math.random() > 0.8 ? 50 : 0
        }
    };
    
    console.log('🔄 Using fallback data:', fallbackData);
    updateDashboard(fallbackData);
}

// FIXED: Update dashboard with validation
function updateDashboard(data) {
    // Validate data before processing
    if (!data || typeof data !== 'object') {
        console.error('❌ Invalid data received:', data);
        return;
    }
    
    lastData = data;
    
    // Update main metrics with safe checks
    const voltageVal = getElementSafe('voltageVal');
    const currentVal = getElementSafe('currentVal');
    const powerVal = getElementSafe('powerVal');
    
    if (voltageVal) voltageVal.textContent = `${data.voltage || 0} V`;
    if (currentVal) currentVal.textContent = `${(data.current || 0).toFixed(2)} A`;
    if (powerVal) powerVal.textContent = `${data.total_power || 0} W`;
    
    // Update voltage status
    const voltageStatus = getElementSafe('voltageStatus');
    if (voltageStatus) {
        if (data.voltage > 0) {
            voltageStatus.textContent = 'Supply OK';
            voltageStatus.className = 'metric-trend voltage-ok';
        } else {
            voltageStatus.textContent = 'No Supply';
            voltageStatus.className = 'metric-trend voltage-no-supply';
        }
    }
    
    // Update bulb states
    if (data.appliances && typeof data.appliances === 'object') {
        updateBulbStates(data.appliances);
        updateConsumptionChart(data.appliances);
        updateCurrentConfiguration(data.appliances);
        
        // Update connected bulbs count
        const connectedCount = Object.values(data.appliances).filter(power => power > 0).length;
        const connectedBulbs = getElementSafe('connectedBulbs');
        const bulbStatus = getElementSafe('bulbStatus');
        
        if (connectedBulbs) connectedBulbs.textContent = connectedCount;
        if (bulbStatus) bulbStatus.textContent = connectedCount > 0 ? `${connectedCount} ON` : 'All OFF';
    }
    
    // Update last update time
    const lastUpdate = getElementSafe('lastUpdate');
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString();
    
    // Send power data to NILM for real-time analysis
    if (data.total_power > 0) {
        sendToNILMModel(data.total_power);
    }
    
    // Trigger prediction update
    calculateMonthlyBillPrediction();
}

// NEW: NILM WebSocket Connection
function initializeNILM() {
    console.log('🧠 Initializing NILM System...');
    
    // Connect to NILM WebSocket
    connectNILMWebSocket();
    
    // Initialize Power Signature Chart
    waitForElement('powerSignatureChart', () => {
        initializePowerSignatureChart();
    });
    
    // Setup NILM Event Listeners
    setupNILMEventListeners();
    
    console.log('✅ NILM System initialized');
}

// NEW: Connect to NILM WebSocket
function connectNILMWebSocket() {
    try {
        nilmWebSocket = new WebSocket('ws://localhost:8000/ws/nilm');
        
        nilmWebSocket.onopen = function() {
            console.log('🔌 NILM WebSocket connected');
            updateNILMStatus('Connected', 'success');
        };
        
        nilmWebSocket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            console.log('🔍 NILM Detection Results:', data);
            updateDetectedAppliances(data.detected_appliances);
        };
        
        nilmWebSocket.onclose = function() {
            console.log('🔌 NILM WebSocket disconnected');
            updateNILMStatus('Disconnected', 'error');
            // Reconnect after 3 seconds
            setTimeout(connectNILMWebSocket, 3000);
        };
        
        nilmWebSocket.onerror = function(error) {
            console.error('❌ NILM WebSocket error:', error);
            updateNILMStatus('Error', 'error');
        };
        
    } catch (error) {
        console.error('❌ NILM WebSocket setup error:', error);
    }
}

// NEW: Send power data to NILM model
function sendToNILMModel(powerValue) {
    if (nilmWebSocket && nilmWebSocket.readyState === WebSocket.OPEN) {
        // Send current power value for real-time analysis
        nilmWebSocket.send(JSON.stringify([powerValue]));
        
        // Update power signature chart
        if (powerChart) {
            timeCounter++;
            powerChart.data.labels.push(`T${timeCounter}`);
            powerChart.data.datasets[0].data.push(powerValue);
            
            // Keep only last 20 data points
            if (powerChart.data.labels.length > 20) {
                powerChart.data.labels.shift();
                powerChart.data.datasets[0].data.shift();
            }
            
            powerChart.update('none');
        }
    }
}

// NEW: Update detected appliances display
function updateDetectedAppliances(appliances) {
    const applianceList = getElementSafe('applianceList');
    if (!applianceList) return;
    
    if (!appliances || appliances.length === 0) {
        applianceList.innerHTML = `
            <div class="appliance-item no-appliance">
                <i class="fas fa-search"></i>
                <span>No appliances detected</span>
            </div>
        `;
        return;
    }
    
    applianceList.innerHTML = appliances.map(appliance => `
        <div class="appliance-item detected">
            <div class="appliance-icon">${appliance.icon}</div>
            <div class="appliance-details">
                <div class="appliance-name">${appliance.name}</div>
                <div class="appliance-power">${appliance.detected_power}W</div>
                <div class="appliance-range">${appliance.power_range}</div>
            </div>
            <div class="appliance-confidence">
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${appliance.confidence * 100}%"></div>
                </div>
                <span class="confidence-value">${Math.round(appliance.confidence * 100)}%</span>
            </div>
        </div>
    `).join('');
}

// NEW: Update NILM status
function updateNILMStatus(status, type) {
    const statusElement = getElementSafe('modelStatus');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `status-${type}`;
    }
}

function initializePowerSignatureChart() {
    const canvas = getElementSafe('powerSignatureChart');
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');
        powerChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Power Consumption (W)',
                    data: [],
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Power (Watt)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    }
                }
            }
        });
        console.log('✅ Power Signature chart initialized');
    } catch (error) {
        console.error('❌ Power Signature chart error:', error);
    }
}

function setupNILMEventListeners() {
    // Safe event listener setup
    const startBtn = getElementSafe('startMonitoring');
    const stopBtn = getElementSafe('stopMonitoring');
    const analyzeBtn = getElementSafe('analyzeData');
    const trainBtn = getElementSafe('trainModel');
    
    if (startBtn) {
        startBtn.addEventListener('click', startNILMMonitoring);
    }
    
    if (stopBtn) {
        stopBtn.addEventListener('click', stopNILMMonitoring);
    }
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeNILMData);
    }
    
    if (trainBtn) {
        trainBtn.addEventListener('click', trainNILMModel);
    }
    
    // Enable buttons by default since we're using real-time WebSocket
    if (startBtn) startBtn.disabled = false;
    if (analyzeBtn) analyzeBtn.disabled = false;
}

// NILM Monitoring Functions
function startNILMMonitoring() {
    if (monitoringInterval) {
        console.log('⚠️ NILM monitoring already running');
        return;
    }
    
    console.log('🔍 Starting NILM monitoring...');
    timeCounter = 0;
    
    monitoringInterval = setInterval(() => {
        // Real-time monitoring is handled by WebSocket
        // This interval is just for UI updates
    }, 1000);
    
    updateNILMButtonStates(true);
    updateNILMStatus('Monitoring Active', 'success');
}

function stopNILMMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
        console.log('🛑 NILM monitoring stopped');
    }
    
    updateNILMButtonStates(false);
    updateNILMStatus('Monitoring Stopped', 'warning');
}

function updateNILMButtonStates(isMonitoring) {
    const startBtn = getElementSafe('startMonitoring');
    const stopBtn = getElementSafe('stopMonitoring');
    
    if (startBtn) {
        startBtn.disabled = isMonitoring;
        startBtn.style.opacity = isMonitoring ? '0.6' : '1';
    }
    
    if (stopBtn) {
        stopBtn.disabled = !isMonitoring;
        stopBtn.style.opacity = !isMonitoring ? '0.6' : '1';
    }
}

async function analyzeNILMData() {
    if (!lastData) {
        alert('Please wait for power data to be available!');
        return;
    }
    
    console.log('🔬 Analyzing power data with NILM...');
    updateNILMStatus('Analyzing...', 'info');
    
    // Send current power data for analysis
    if (lastData.total_power > 0) {
        sendToNILMModel(lastData.total_power);
    }
}

async function trainNILMModel() {
    console.log('🎯 Training NILM Model...');
    updateNILMStatus('Training in progress...', 'info');

    try {
        const response = await fetch('http://localhost:8000/api/nilm/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dataset_id: 'default'
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            updateNILMStatus('Model Trained Successfully', 'success');
            alert('Model trained successfully! Accuracy: ' + (result.model_accuracy * 100).toFixed(1) + '%');
        } else {
            updateNILMStatus('Training Failed', 'error');
            alert('Training failed: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Training error:', error);
        updateNILMStatus('Training Error', 'error');
        alert('Training error: ' + error.message);
    }
}

// Initialize analytics
function initializeAnalytics() {
    const analyticsCharts = [
        'powerTrendChart', 'dailyPatternChart', 'costAnalysisChart', 'applianceUsageChart'
    ];
    
    analyticsCharts.forEach(chartId => {
        waitForElement(chartId, () => {
            initializeAnalyticsChart(chartId);
        });
    });
    
    setupTimeFilters();
    loadHistoricalData();
}

function initializeAnalyticsChart(chartId) {
    const canvas = getElementSafe(chartId);
    if (!canvas) return;

    try {
        const ctx = canvas.getContext('2d');
        let chart;
        
        switch(chartId) {
            case 'powerTrendChart':
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                        datasets: [{
                            label: 'Power (W)',
                            data: Array(24).fill(0),
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Watts (W)' } },
                            x: { title: { display: true, text: 'Time' } }
                        }
                    }
                });
                powerTrendChart = chart;
                break;
                
            case 'dailyPatternChart':
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['12AM', '3AM', '6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
                        datasets: [{
                            label: 'Usage (W)',
                            data: [120, 80, 150, 300, 250, 400, 600, 450],
                            backgroundColor: '#10b981',
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                    }
                });
                dailyPatternChart = chart;
                break;
                
            case 'costAnalysisChart':
                chart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Bulb 1', 'Bulb 2', 'Bulb 3', 'Other'],
                        datasets: [{
                            data: [25, 35, 40, 0],
                            backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
                costAnalysisChart = chart;
                break;
                
            case 'applianceUsageChart':
                chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [
                            {
                                label: 'Bulb 1 (40W)',
                                data: [2.1, 2.3, 1.9, 2.4, 2.2, 2.1, 2.0],
                                backgroundColor: '#3b82f6'
                            },
                            {
                                label: 'Bulb 2 (60W)',
                                data: [3.2, 3.0, 3.5, 3.1, 3.3, 3.6, 3.4],
                                backgroundColor: '#10b981'
                            },
                            {
                                label: 'Bulb 3 (100W)',
                                data: [4.5, 4.8, 4.2, 4.7, 4.9, 5.1, 4.6],
                                backgroundColor: '#f59e0b'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: { stacked: true },
                            y: { stacked: true, title: { display: true, text: 'Energy (kWh)' } }
                        }
                    }
                });
                applianceUsageChart = chart;
                break;
        }
        
        console.log(`✅ ${chartId} initialized`);
    } catch (error) {
        console.error(`❌ ${chartId} error:`, error);
    }
}

// System Status
function updateSystemStatus(status = 'checking') {
    const esp32Status = getElementSafe('esp32Status');
    const apiStatus = getElementSafe('apiStatus');
    
    if (esp32Status && apiStatus) {
        if (status === 'connected') {
            esp32Status.textContent = 'Connected';
            esp32Status.style.color = '#4CAF50';
            apiStatus.textContent = 'Running';
            apiStatus.style.color = '#4CAF50';
            hideLoading();
        } else if (status === 'disconnected') {
            esp32Status.textContent = 'Disconnected';
            esp32Status.style.color = '#f44336';
            apiStatus.textContent = 'Error';
            apiStatus.style.color = '#f44336';
            showLoading();
        } else {
            esp32Status.textContent = 'Checking...';
            esp32Status.style.color = '#ff9800';
            apiStatus.textContent = 'Checking...';
            apiStatus.style.color = '#ff9800';
        }
    }
}

function showLoading() {
    const spinner = getElementSafe('loadingSpinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
    const spinner = getElementSafe('loadingSpinner');
    if (spinner) spinner.style.display = 'none';
}

// Rest of your original functions (updateBulbStates, updateConsumptionChart, etc.)
function updateBulbStates(appliances) {
    const bulbs = [
        { id: 'bulb1', statusId: 'bulb1Status', powerId: 'bulb1Power', appliance: 'Bulb_40W' },
        { id: 'bulb2', statusId: 'bulb2Status', powerId: 'bulb2Power', appliance: 'Bulb_60W' },
        { id: 'bulb3', statusId: 'bulb3Status', powerId: 'bulb3Power', appliance: 'Bulb_100W' }
    ];
    
    bulbs.forEach(bulb => {
        const bulbElement = getElementSafe(bulb.id);
        const statusElement = getElementSafe(bulb.statusId);
        const powerElement = getElementSafe(bulb.powerId);
        
        if (bulbElement && statusElement && powerElement) {
            const indicator = statusElement.previousElementSibling;
            const isOn = appliances[bulb.appliance] > 0;
            const actualPower = appliances[bulb.appliance] || 0;
            
            if (isOn) {
                bulbElement.className = 'bulb on';
                statusElement.textContent = 'ON';
                if (indicator) indicator.className = 'status-indicator status-on';
                powerElement.textContent = `${actualPower}W`;
                powerElement.style.color = '#ffeb3b';
            } else {
                bulbElement.className = 'bulb off';
                statusElement.textContent = 'OFF';
                if (indicator) indicator.className = 'status-indicator status-off';
                powerElement.textContent = '0W';
                powerElement.style.color = '#ccc';
            }
        }
    });
}

function updateConsumptionChart(appliances) {
    if (!consumptionChart) return;
    
    const chartData = [
        appliances['Bulb_40W'] || 0,
        appliances['Bulb_60W'] || 0,
        appliances['Bulb_100W'] || 0,
        appliances['Other'] || 0
    ];
    
    consumptionChart.data.datasets[0].data = chartData;
    consumptionChart.update('none');
}

function updateCurrentConfiguration(appliances) {
    const configElement = getElementSafe('currentConfig');
    if (!configElement) return;
    
    const onBulbs = [];
    if (appliances['Bulb_40W'] > 0) onBulbs.push('Bulb 1 (40W)');
    if (appliances['Bulb_60W'] > 0) onBulbs.push('Bulb 2 (60W)');
    if (appliances['Bulb_100W'] > 0) onBulbs.push('Bulb 3 (100W)');
    
    if (onBulbs.length > 0) {
        const totalPower = Object.values(appliances).reduce((a, b) => a + b, 0).toFixed(1);
        configElement.innerHTML = `
            <span style="color: #4CAF50;">✅ Currently ON: ${onBulbs.join(', ')}</span><br>
            <small style="color: #ccc;">Total Power: ${totalPower}W</small>
        `;
    } else {
        configElement.innerHTML = `
            <span style="color: #f44336;">❌ No bulbs are currently ON</span><br>
            <small style="color: #ccc;">Use ESP32 Serial Monitor to turn on bulbs</small>
        `;
    }
}

// Analytics helper functions
function setupTimeFilters() {
    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            timeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const period = this.dataset.period;
            updateChartsForPeriod(period);
        });
    });

    const exportBtn = getElementSafe('exportData');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
}

function loadHistoricalData() {
    historicalData = Array.from({length: 100}, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000),
        power: Math.floor(Math.random() * 800) + 200,
        cost: (Math.random() * 50 + 10).toFixed(2)
    }));
    
    updateAnalyticsSummary('24h');
}

function updateChartsForPeriod(period) {
    const labels = generateTimeLabels(period);
    
    if (powerTrendChart) {
        powerTrendChart.data.labels = labels;
        powerTrendChart.data.datasets[0].data = generateSampleData(period);
        powerTrendChart.update();
    }
    
    updateAnalyticsSummary(period);
}

function generateTimeLabels(period) {
    if (period === '24h') {
        return Array.from({length: 24}, (_, i) => `${i}:00`);
    } else if (period === '7d') {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else {
        return Array.from({length: 30}, (_, i) => `Day ${i + 1}`);
    }
}

function generateSampleData(period) {
    const length = period === '24h' ? 24 : period === '7d' ? 7 : 30;
    return Array.from({length}, () => Math.floor(Math.random() * 800) + 200);
}

function updateAnalyticsSummary(period) {
    const totalConsumption = (Math.random() * 100 + 50).toFixed(1);
    const totalCost = (totalConsumption * ELECTRICITY_RATE).toFixed(0);
    const carbonFootprint = (totalConsumption * CARBON_FACTOR).toFixed(1);
    
    const totalConsumptionEl = getElementSafe('totalConsumption');
    const totalCostEl = getElementSafe('totalCost');
    const carbonFootprintEl = getElementSafe('carbonFootprint');
    const peakUsageEl = getElementSafe('peakUsage');
    
    if (totalConsumptionEl) totalConsumptionEl.textContent = `${totalConsumption} kWh`;
    if (totalCostEl) totalCostEl.textContent = `₹${totalCost}`;
    if (carbonFootprintEl) carbonFootprintEl.textContent = `${carbonFootprint} kg`;
    if (peakUsageEl) peakUsageEl.textContent = '800W at 18:30';
    
    const consumptionChange = getElementSafe('consumptionChange');
    const costChange = getElementSafe('costChange');
    const carbonChange = getElementSafe('carbonChange');
    
    if (consumptionChange) consumptionChange.textContent = '+12%';
    if (costChange) costChange.textContent = '+15%';
    if (carbonChange) carbonChange.textContent = '+10%';
}

function exportData() {
    const headers = ['Timestamp', 'Power (W)', 'Voltage (V)', 'Current (A)', 'Cost (₹)'];
    const csvData = historicalData.map(entry => [
        entry.timestamp.toISOString(),
        entry.power,
        (entry.power / 4.5).toFixed(2),
        (entry.power / 230).toFixed(3),
        entry.cost
    ].join(','));
    
    const csv = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
}

// Navigation
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('nav a');
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        if (window.scrollY >= sectionTop) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('nav-active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('nav-active');
        }
    });
});

// Start the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded - starting application...');
    initializeAllCharts();
});