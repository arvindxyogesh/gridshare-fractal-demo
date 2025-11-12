class FractalDemo {
    constructor() {
        this.apiBase = '/api';
        this.isRendering = false;
        this.pollInterval = null;
        this.currentJobId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.startStatusPolling();
        this.updateIterationsValue();
        this.initAdvancedUI();
    }

    initAdvancedUI() {
        // Add loading states to buttons
        this.addButtonLoadingStates();
        
        // Initialize tooltips
        this.initTooltips();
        
        // Add keyboard shortcuts
        this.initKeyboardShortcuts();
    }

    bindEvents() {
        // Render button
        document.getElementById('render-btn').addEventListener('click', () => {
            this.startRendering();
        });

        // Stop button
        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopRendering();
        });

        // Iterations slider
        document.getElementById('iterations').addEventListener('input', (e) => {
            this.updateIterationsValue();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.startRendering();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.stopRendering();
                        break;
                }
            }
        });
    }

    addButtonLoadingStates() {
        const renderBtn = document.getElementById('render-btn');
        
        renderBtn.addEventListener('click', () => {
            if (this.isRendering) return;
            
            // Add loading state
            const originalText = renderBtn.innerHTML;
            renderBtn.innerHTML = '<div class="loading-spinner"></div> Starting Render...';
            renderBtn.disabled = true;
            
            // Restore after 2 seconds if still not rendering
            setTimeout(() => {
                if (!this.isRendering) {
                    renderBtn.innerHTML = originalText;
                    renderBtn.disabled = false;
                }
            }, 2000);
        });
    }

    initTooltips() {
        // Add tooltips to form elements
        const tooltipElements = document.querySelectorAll('.form-group');
        
        tooltipElements.forEach(element => {
            const label = element.querySelector('label');
            if (label) {
                switch(label.textContent.trim()) {
                    case 'Resolution:':
                        element.setAttribute('title', 'Higher resolution = more detail but longer render time');
                        break;
                    case 'Iterations:':
                        element.setAttribute('title', 'More iterations = more detailed fractal but slower rendering');
                        break;
                    case 'Tiles:':
                        element.setAttribute('title', 'More tiles = better distribution across workers');
                        break;
                }
            }
        });
    }

    initKeyboardShortcuts() {
        // Show keyboard shortcuts help
        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.showKeyboardShortcuts();
            }
        });
    }

    showKeyboardShortcuts() {
        this.showNotification(`
            <strong>Keyboard Shortcuts:</strong><br>
            • Ctrl/Cmd + Enter: Start Render<br>
            • Ctrl/Cmd + Escape: Stop Render<br>
            • Ctrl/Cmd + ?: Show this help
        `, 'info', 5000);
    }

    updateIterationsValue() {
        const slider = document.getElementById('iterations');
        const valueSpan = document.getElementById('iterations-value');
        const value = parseInt(slider.value);
        
        valueSpan.textContent = value;
        
        // Update color based on value
        if (value < 500) {
            valueSpan.style.color = '#10b981'; // Green
        } else if (value < 1000) {
            valueSpan.style.color = '#f59e0b'; // Orange
        } else {
            valueSpan.style.color = '#ef4444'; // Red
        }
    }

    async startRendering() {
        if (this.isRendering) return;

        const settings = this.getRenderSettings();
        this.isRendering = true;
        this.currentJobId = 'job_' + Date.now();
        this.updateUIForRendering(true);

        // Add render start animation
        this.animateRenderStart();

        try {
            const response = await fetch(`${this.apiBase}/render`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to start rendering');
            }

            const data = await response.json();
            this.currentJobId = data.job_id;
            
            this.showNotification('🚀 Render started! Distributing work across workers...', 'success');
            
            // Update button to show loading
            const renderBtn = document.getElementById('render-btn');
            renderBtn.innerHTML = '<div class="loading-spinner"></div> Rendering...';
            
        } catch (error) {
            console.error('Error starting render:', error);
            this.showNotification('❌ Failed to start rendering. Please check if workers are running.', 'error');
            this.isRendering = false;
            this.updateUIForRendering(false);
        }
    }

    animateRenderStart() {
        // Add pulse animation to workers
        const workers = document.querySelectorAll('.worker-status.healthy');
        workers.forEach(worker => {
            worker.classList.add('pulse');
        });

        // Animate progress bar
        const progressFill = document.getElementById('progress-fill');
        progressFill.style.transition = 'width 0.3s ease';
    }

    stopRendering() {
        if (!this.isRendering) return;
        
        this.showNotification('⏹️ Stopping render...', 'info');
        
        // In a real implementation, you'd call an API to stop the job
        setTimeout(() => {
            this.isRendering = false;
            this.updateUIForRendering(false);
            this.showNotification('Render stopped.', 'info');
        }, 1000);
    }

    getRenderSettings() {
        return {
            width: parseInt(document.getElementById('resolution').value),
            height: parseInt(document.getElementById('resolution').value),
            tiles: parseInt(document.getElementById('tiles').value),
            max_iter: parseInt(document.getElementById('iterations').value),
            use_gpu: document.getElementById('use_gpu').checked
        };
    }

    async updateStatus() {
        try {
            const response = await fetch(`${this.apiBase}/status`);
            const data = await response.json();

            this.updateWorkersStatus(data.workers);
            this.updateJobStatus(data);
            
            if (data.job_status === 'completed' && this.isRendering) {
                this.handleRenderComplete(data);
            } else if (data.job_status.startsWith('error')) {
                this.handleRenderError(data);
            }

        } catch (error) {
            console.error('Error fetching status:', error);
            this.updateWorkersStatus([]);
        }
    }

    updateWorkersStatus(workers) {
        const container = document.getElementById('workers-status');
        
        if (workers.length === 0) {
            container.innerHTML = `
                <div class="worker-status offline">
                    <div class="worker-info">
                        <div class="worker-icon">⚠️</div>
                        <div class="worker-details">
                            <div class="worker-name">No workers available</div>
                            <div class="worker-gpu">Check if workers are running</div>
                        </div>
                    </div>
                    <div class="status-indicator">Offline</div>
                </div>
            `;
            return;
        }

        container.innerHTML = workers.map(worker => `
            <div class="worker-status ${worker.status}">
                <div class="worker-info">
                    <div class="worker-icon">
                        ${worker.status === 'healthy' ? '⚡' : 
                          worker.status === 'unhealthy' ? '⚠️' : '❌'}
                    </div>
                    <div class="worker-details">
                        <div class="worker-name">${worker.id}</div>
                        <div class="worker-gpu">${worker.gpu}</div>
                    </div>
                </div>
                <div class="status-indicator">${worker.status}</div>
            </div>
        `).join('');
    }

    updateJobStatus(data) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        const perfStats = document.getElementById('performance-stats');

        // Update progress bar with smooth animation
        progressFill.style.width = `${data.progress}%`;
        
        let statusText = 'Ready to render';
        let statusEmoji = '🎯';
        
        if (data.job_status === 'processing') {
            statusEmoji = '🔄';
            statusText = `Rendering... ${data.progress.toFixed(1)}%`;
            
            // Add active class to image container during render
            document.querySelector('.image-container').classList.add('has-image');
        } else if (data.job_status === 'completed') {
            statusEmoji = '✅';
            statusText = `Completed in ${data.total_time?.toFixed(2) || 0}s`;
        } else if (data.job_status.startsWith('error')) {
            statusEmoji = '❌';
            statusText = `Error: ${data.job_status.replace('error: ', '')}`;
        }

        progressText.innerHTML = `${statusEmoji} ${statusText}`;

        // Update performance stats
        if (data.tile_times && data.tile_times.length > 0) {
            const avgTime = data.tile_times.reduce((a, b) => a + b, 0) / data.tile_times.length;
            const tilesPerSecond = data.tile_times.length / (data.total_time || 1);
            const totalPixels = data.performance?.total_pixels || 0;
            const pixelsPerSecond = totalPixels / (data.total_time || 1);
            
            perfStats.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">${avgTime.toFixed(2)}s</div>
                    <div class="stat-label">Avg Tile Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.tile_times.length}</div>
                    <div class="stat-label">Tiles Done</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${tilesPerSecond.toFixed(1)}</div>
                    <div class="stat-label">Tiles/Sec</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${(pixelsPerSecond / 1000000).toFixed(1)}M</div>
                    <div class="stat-label">Pixels/Sec</div>
                </div>
            `;
        } else {
            perfStats.innerHTML = `
                <div class="stat-item">
                    <div class="stat-value">0.00s</div>
                    <div class="stat-label">Avg Tile Time</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">0</div>
                    <div class="stat-label">Tiles Done</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">0.0</div>
                    <div class="stat-label">Tiles/Sec</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">0.0M</div>
                    <div class="stat-label">Pixels/Sec</div>
                </div>
            `;
        }
    }

    async handleRenderComplete(data) {
        await this.updateFractalImage();
        this.isRendering = false;
        this.updateUIForRendering(false);
        
        // Remove pulse animation from workers
        const workers = document.querySelectorAll('.worker-status');
        workers.forEach(worker => {
            worker.classList.remove('pulse');
        });
        
        const renderTime = data.total_time?.toFixed(2) || 0;
        this.showNotification(`🎉 Render completed in ${renderTime}s!`, 'success');
    }

    handleRenderError(data) {
        this.isRendering = false;
        this.updateUIForRendering(false);
        
        const errorMsg = data.job_status.replace('error: ', '');
        this.showNotification(`❌ Render failed: ${errorMsg}`, 'error');
    }

    async updateFractalImage() {
        const img = document.getElementById('fractal-image');
        const noImage = document.getElementById('no-image');
        const imageContainer = document.querySelector('.image-container');
        
        // Add loading state to image
        img.style.opacity = '0.5';
        
        // Update image with cache busting
        img.src = `${this.apiBase}/image?t=${Date.now()}&job=${this.currentJobId}`;
        img.style.display = 'block';
        noImage.style.display = 'none';
        imageContainer.classList.add('has-image');
        
        // Fade in image when loaded
        img.onload = () => {
            img.style.opacity = '1';
            img.style.transition = 'opacity 0.5s ease';
        };
    }

    updateUIForRendering(rendering) {
        const renderBtn = document.getElementById('render-btn');
        const stopBtn = document.getElementById('stop-btn');
        const controls = document.querySelectorAll('.form-group select, .form-group input');
        
        renderBtn.disabled = rendering;
        stopBtn.disabled = !rendering;
        
        // Disable/enable form controls during render
        controls.forEach(control => {
            control.disabled = rendering;
        });
        
        if (!rendering) {
            renderBtn.innerHTML = '<i class="fas fa-play"></i> Render Fractal';
            document.getElementById('progress-fill').style.width = '0%';
        }
    }

    startStatusPolling() {
        this.updateStatus();
        this.pollInterval = setInterval(() => {
            this.updateStatus();
        }, 2000);
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new FractalDemo();
    
    // Add some visual enhancements
    addVisualEnhancements();
});

function addVisualEnhancements() {
    // Add hover effects to cards
    const cards = document.querySelectorAll('.control-panel, .status-panel, .result-panel');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-2px)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = 'var(--shadow-card)';
        });
    });
    
    // Add click effect to buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
            `;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Add CSS for ripple effect
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn-primary, .btn-secondary {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(style);
