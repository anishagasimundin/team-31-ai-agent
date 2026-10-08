// Menu Data
const menuItems = [
    {
        id: 1,
        category: 'espresso',
        name: 'Signature Velvet Latte',
        price: '$5.50',
        desc: 'Double shot of our signature dark roast espresso with steamed silky oat milk and vanilla bean infusion.',
        img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 2,
        category: 'espresso',
        name: 'Caramel Macchiato',
        price: '$5.80',
        desc: 'Freshly steamed milk with vanilla-flavored syrup marked with espresso and topped with caramel drizzle.',
        img: 'https://images.unsplash.com/photo-1485808194679-6246e7b232d0?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 3,
        category: 'pour-over',
        name: 'Ethiopian Yirgacheffe',
        price: '$6.20',
        desc: 'Single-origin pour over featuring bright floral notes with undertones of bergamot and wild jasmine.',
        img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 4,
        category: 'pour-over',
        name: 'Nitro Cold Brew',
        price: '$5.20',
        desc: 'Slow-steeped cold brew infused with nitrogen gas for a velvety-smooth, cascading stout-like creamy texture.',
        img: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 5,
        category: 'bakery',
        name: 'French Butter Croissant',
        price: '$4.20',
        desc: 'Flaky, golden-brown pastry baked fresh every morning with authentic imported European cultured butter.',
        img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600'
    },
    {
        id: 6,
        category: 'bakery',
        name: 'Almond Praline Danish',
        price: '$4.80',
        desc: 'Laminated pastry dough filled with rich almond frangipane and topped with toasted sliced almonds.',
        img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600'
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
                <button class="btn btn-secondary" style="margin-top: 12px; width: 100%; justify-content: center; font-size: 0.85rem; padding: 10px;" onclick="showToast('Added ${item.name} to your order!')">Order Now</button>
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
    showToast(`Thank you ${name}! Your message has been sent successfully.`, 'success');
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
        color = '#10b981';
    }

    toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}; font-size: 1.1rem;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
