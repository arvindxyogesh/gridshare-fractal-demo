// Landing page animations
document.addEventListener('DOMContentLoaded', function() {
    console.log('GridShare Landing Page Loaded');
    
    // Simple animation for stats
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach((stat, index) => {
        setTimeout(() => {
            stat.style.opacity = '1';
            stat.style.transform = 'translateY(0)';
        }, index * 200);
    });
});
