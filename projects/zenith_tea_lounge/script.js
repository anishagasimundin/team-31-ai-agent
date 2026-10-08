// Menu Data
const menuItems = [
    {
        id: 1,
        category: 'matcha',
        name: 'Ceremonial Uji Matcha',
        price: '$6.50',
        desc: 'First-harvest shade-grown green tea stone-ground in Kyoto, whisked to a rich frothy emerald perfection.',
        img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 2,
        category: 'matcha',
        name: 'Vanilla Bean Iced Matcha Latte',
        price: '$6.80',
        desc: 'Ceremonial matcha layered over cold organic oat milk and infused with Madagascar vanilla bean syrup.',
        img: 'https://images.unsplash.com/photo-1515823064-d6e0c046c4a7?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 3,
        category: 'oolong',
        name: 'High Mountain Alishan Oolong',
        price: '$7.20',
        desc: 'Hand-picked from 2,000m mist-shrouded Taiwanese peaks. Sweet floral fragrance with a buttery smooth finish.',
        img: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 4,
        category: 'oolong',
        name: 'Imperial Earl Grey',
        price: '$5.50',
        desc: 'Bold organic black tea scented with cold-pressed Calabrian bergamot oil and accented with blue cornflower petals.',
        img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 5,
        category: 'herbal',
        name: 'Lavender Chamomile Dream',
        price: '$5.20',
        desc: 'Caffeine-free soothing blend of Egyptian whole chamomile flowers, French lavender buds, and sweet rooibos.',
        img: 'https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 6,
        category: 'herbal',
        name: 'Jasmine Silver Needle White',
        price: '$7.50',
        desc: 'Delicate hand-rolled white tea buds naturally scented overnight with fresh night-blooming jasmine blossoms.',
        img: 'https://images.unsplash.com/photo-1563911862413-688c5201275b?auto=format&fit=crop&q=80&w=600'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    renderMenu('all');
});

// Render Menu items
function renderMenu(category) {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = category === 'all' ? menuItems : menuItems.filter(item => item.category === category);

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.innerHTML = `
            <div class="menu-card-img">
                <img src="${item.img}" alt="${item.name}">
            </div>
            <div class="menu-card-body">
                <div class="menu-card-top">
                    <h3>${item.name}</h3>
                    <span class="menu-card-price">${item.price}</span>
                </div>
                <p>${item.desc}</p>
                <button class="btn btn-secondary" style="margin-top: 12px; width: 100%; justify-content: center; font-size: 0.85rem; padding: 10px;" onclick="showToast('Added ${item.name} to your order!')">Order Tea Cup</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterMenu(category, btnElement) {
    document.querySelectorAll('.menu-tab').forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
    renderMenu(category);
}

// Mobile Navigation
function toggleMobileMenu() {
    const mobileNav = document.getElementById('mobileNav');
    const menuIcon = document.getElementById('menuIcon');
    mobileNav.classList.toggle('active');
    if (mobileNav.classList.contains('active')) {
        menuIcon.className = 'fa-solid fa-xmark';
    } else {
        menuIcon.className = 'fa-solid fa-bars';
    }
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const btnIcon = document.querySelector('#themeToggleBtn i');
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        btnIcon.className = 'fa-solid fa-sun';
    } else {
        html.setAttribute('data-theme', 'dark');
        btnIcon.className = 'fa-solid fa-moon';
    }
}

// Contact Form Handler
function handleContactSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('contactName').value;
    showToast(`Thank you ${name}! Your table reservation request has been received.`, 'success');
    document.getElementById('contactForm').reset();
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-circle-info';
    let color = 'var(--accent)';
    if (type === 'success') {
        icon = 'fa-circle-check';
        color = '#52b788';
    }

    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
