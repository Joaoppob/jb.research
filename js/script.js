document.addEventListener('DOMContentLoaded', () => {

    // UI Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');
    const navbar = document.querySelector('.navbar');
    const overlay = document.getElementById('subpage-overlay');
    const subpageContent = document.getElementById('subpage-content');

    // Core Router State
    let isFetching = false;

    // --- NAVIGATION ENGINE --- //
    function navigateToHash() {
        let hash = window.location.hash || '#home';

        // 1. Intercept External Page Route (#tema/...)
        if (hash.startsWith('#tema/')) {
            const temaId = hash.split('/')[1];
            loadTemaContent(temaId);
            return;
        }

        // 2. Clear overlays if back to base pages
        if (overlay.classList.contains('open')) {
            overlay.classList.remove('open');
            setTimeout(() => { subpageContent.innerHTML = ''; }, 600); // Clear after transiton
            isAdminMode = false;
            _akBuffer = '';
            document.removeEventListener('keydown', _onAdminKey);
        }

        // 3. Find matching local section bypassing native 'id' scrolling jump bug
        // By looking for 'route-' prefix.
        let routeId = "route-" + hash.substring(1);
        let targetSection = document.getElementById(routeId);

        if (!targetSection) {
            hash = '#home';
            targetSection = document.getElementById('route-home');
        }

        // 4. Update Header Nav Links states
        navLinks.forEach(link => {
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 5. Swap Active Sections securely removing/adding state to trigger CSS Transitions
        sections.forEach(sec => {
            if (sec !== targetSection && sec.classList.contains('active')) {
                sec.classList.remove('active');
                setTimeout(() => { sec.scrollTop = 0; }, 600); // Only reset scroll when fully hidden
            }
        });

        // Use a tiny timeout to ensure classes are purged if user clicked the same tab
        setTimeout(() => {
            targetSection.classList.add('active');
        }, 10);
    }

    // --- GLASSMORPHISM NAVBAR LISTENER --- //
    sections.forEach(sec => {
        sec.addEventListener('scroll', (e) => {
            if (e.target.scrollTop > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    });

    // Subpage Modal Navbar handler
    overlay.addEventListener('scroll', (e) => {
        if (e.target.scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- FETCH ENGINE (AJAX) --- //
    async function loadTemaContent(id) {
        if (isFetching) return;
        isFetching = true;

        // Visual loading state trigger
        document.body.style.cursor = 'wait';

        try {
            const response = await fetch(`discussoes/tema${id}.html`);
            if (!response.ok) throw new Error('Tema não encontrado no servidor');

            const html = await response.text();

            subpageContent.innerHTML = `
                <div class="subpage-bg"></div>
                ${html}
            `;

            requestAnimationFrame(() => {
                overlay.classList.add('open');
                overlay.scrollTop = 0;
                isFetching = false;
                document.body.style.cursor = 'none'; // Put back custom cursor logic
                setupBackButton();
                if (window.initCommentsManager) window.initCommentsManager(id); // Inject comment logic
                bindCustomCursorHovers(); // Rebind hovers to new HTML
            });

        } catch (error) {
            console.error(error);
            subpageContent.innerHTML = `
                <div class="subpage-bg"></div>
                <div class="tema-wrapper" style="text-align: center; padding-top: 30vh;">
                    <button class="btn-back" id="back-btn">← Voltar</button>
                    <h2>O conteúdo do Tema ${id} ainda não existe ou ocorreu um erro.</h2>
                </div>
            `;
            overlay.classList.add('open');
            isFetching = false;
            document.body.style.cursor = 'none';
            setupBackButton();
            bindCustomCursorHovers();
        }
    }

    function setupBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.location.hash = '#discussoes';
            });
        }
    }

    // --- BIND EVENTS --- //
    window.addEventListener('hashchange', navigateToHash);
    navigateToHash(); // Init

    // --- MOUSE CURSOR TRACKING --- //
    const cursorSmall = document.getElementById('circle-cursor');
    const cursorLarge = document.getElementById('circle-cursorGrande');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let largeX = mouseX;
    let largeY = mouseY;

    // Smooth physics loop for the larger circle
    function animateCursor() {
        // LERP (Linear Interpolation) for a smooth follow delay
        largeX += (mouseX - largeX) * 0.15;
        largeY += (mouseY - largeY) * 0.15;

        cursorLarge.style.left = largeX + 'px';
        cursorLarge.style.top = largeY + 'px';

        requestAnimationFrame(animateCursor);
    }
    requestAnimationFrame(animateCursor);

    document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Small circle snaps instantly
        cursorSmall.style.left = mouseX + 'px';
        cursorSmall.style.top = mouseY + 'px';

        // Mild parallax for BG
        const x = (window.innerWidth / 2 - mouseX) / 80;
        const y = (window.innerHeight / 2 - mouseY) / 80;
        const bg = document.querySelector('.site-bg');
        if (bg) bg.style.transform = `scale(1.05) translate(${x}px, ${y}px)`;
    });

    // Custom Hover engine
    function bindCustomCursorHovers() {
        if (window.innerWidth <= 768) return; // Desativa lógica pesada de hover em telas sensíveis a toque

        const hoverables = document.querySelectorAll('a, button, .glass-card, .tema-card');
        hoverables.forEach(el => {
            // Previne listeners multiplicados caso rodemos de novo
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mouseleave', onLeave);

            el.addEventListener('mouseenter', onEnter);
            el.addEventListener('mouseleave', onLeave);
        });
    }

    function onEnter() { document.body.classList.add('hovering'); }
    function onLeave() { document.body.classList.remove('hovering'); }

    bindCustomCursorHovers();
});

// --- CONTACT FORM --- //
(function initContactForm() {
    const EDGE_URL = 'https://nwrupmfqjujcvmahyetc.supabase.co/functions/v1/send-contact-email';

    function setupContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        const submitBtn  = document.getElementById('contact-submit');
        const feedback   = document.getElementById('contact-feedback');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name    = form.name.value.trim();
            const email   = form.email.value.trim();
            const message = form.message.value.trim();

            feedback.textContent = '';
            feedback.className = 'contact-feedback';

            if (!name || !email || !message) {
                feedback.textContent = 'Preencha todos os campos.';
                feedback.classList.add('error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'ENVIANDO…';

            try {
                const ANON_KEY = 'sb_publishable_6JT7oulx7UetGz8XN_z30A_yqb-6FJ7';
                const res = await fetch(EDGE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': ANON_KEY,
                        'Authorization': `Bearer ${ANON_KEY}`,
                    },
                    body: JSON.stringify({ name, email, message }),
                });

                const data = await res.json();

                if (!res.ok || !data.success) {
                    throw new Error(data.error || 'Erro desconhecido.');
                }

                feedback.textContent = 'Mensagem enviada! Em breve entro em contato.';
                feedback.classList.add('success');
                form.reset();

            } catch (err) {
                feedback.textContent = err.message || 'Falha ao enviar. Tente novamente.';
                feedback.classList.add('error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'ENVIAR MENSAGEM ↗';
            }
        });
    }

    // The form is always in the DOM (not loaded dynamically), so init once.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupContactForm);
    } else {
        setupContactForm();
    }
})();

// --- SUPABASE CLIENT --- //
const _sb = window.supabase.createClient(
    'https://nwrupmfqjujcvmahyetc.supabase.co',
    'sb_publishable_6JT7oulx7UetGz8XN_z30A_yqb-6FJ7'
);
// Admin RPC secret (encoded)
const _ADM = [106,98,114,95,112,101,110,103,117,105,110,95,50,48,50,54,95,97,100,109].map(x => String.fromCharCode(x)).join('');

// --- ANONYMOUS COMMENTS SYSTEM --- //
const ANIMALS = ['cachorro', 'cavalo', 'corvo', 'dragão', 'gato', 'hipopótamo', 'lontra', 'pássaro', 'peixe', 'sapo'];
const COLORS = ['#C6F881', '#F8BC81', '#8190F8', '#F88581', '#F881BE', '#81F8F8'];

// --- ADMIN MODE (session-only, memory-only) --- //
let isAdminMode = false;
let _akBuffer = '';
const _AK = [112,101,110,103,117,105,109].map(c => String.fromCharCode(c)).join('');
let _akTemaId = null;

function _onAdminKey(e) {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    _akBuffer = (_akBuffer + e.key.toLowerCase()).slice(-_AK.length);
    if (_akBuffer === _AK) {
        isAdminMode = true;
        _akBuffer = '';
        if (_akTemaId) renderComments(_akTemaId);
    }
}

window.initCommentsManager = function (temaId) {
    const wrapper = document.getElementById('comments-section-wrapper');
    if (!wrapper) return;

    const btnMakeComment = document.getElementById('btn-make-comment');
    const mainCommentInput = document.getElementById('main-comment-input');
    const btnCancelMain = document.getElementById('btn-cancel-main');
    const btnPublishMain = document.getElementById('btn-publish-main');
    const mainInputName = document.getElementById('main-input-name');
    const mainInputBody = document.getElementById('main-input-body');

    if (btnMakeComment) {
        btnMakeComment.onclick = () => {
            mainCommentInput.style.display = 'block';
            mainInputBody.focus();
        };
    }
    if (btnCancelMain) {
        btnCancelMain.onclick = () => {
            mainCommentInput.style.display = 'none';
            mainInputName.value = '';
            mainInputBody.value = '';
        };
    }

    if (btnPublishMain) {
        btnPublishMain.onclick = async () => {
            const text = mainInputBody.value.trim();
            if (!text) return;
            const name = mainInputName.value.trim();
            btnPublishMain.disabled = true;
            await addComment(temaId, text, name, null);
            btnPublishMain.disabled = false;
            btnCancelMain.onclick();
        };
    }
    if (mainInputBody) {
        mainInputBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                btnPublishMain.click();
            }
        });
    }

    _akTemaId = temaId;
    document.removeEventListener('keydown', _onAdminKey);
    document.addEventListener('keydown', _onAdminKey);

    renderComments(temaId);
};

function getCommentTraits() {
    let pools = JSON.parse(localStorage.getItem('JBResearch_AvatarPools')) || {
        animals: [...ANIMALS],
        colors: [...COLORS]
    };

    if (pools.animals.length === 0) pools.animals = [...ANIMALS];
    if (pools.colors.length === 0) pools.colors = [...COLORS];

    const animIndex = Math.floor(Math.random() * pools.animals.length);
    const colorIndex = Math.floor(Math.random() * pools.colors.length);

    const chosenAnimal = pools.animals.splice(animIndex, 1)[0];
    const chosenColor = pools.colors.splice(colorIndex, 1)[0];

    localStorage.setItem('JBResearch_AvatarPools', JSON.stringify(pools));

    const animalName = chosenAnimal.charAt(0).toUpperCase() + chosenAnimal.slice(1);

    const iconMap = {
        'dragão': 'dragao',
        'hipopótamo': 'hipo',
        'pássaro': 'passaro'
    };
    const iconFile = iconMap[chosenAnimal] || chosenAnimal;

    return {
        animal: chosenAnimal,
        name: animalName,
        color: chosenColor,
        icon: `assets/images/${iconFile}.svg`
    };
}

function getAuthorToken() {
    let token = localStorage.getItem('JBResearch_AuthorToken');
    if (!token) {
        token = 'author_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('JBResearch_AuthorToken', token);
    }
    return token;
}

async function addComment(temaId, text, customName, parentId = null) {
    const traits = getCommentTraits();

    const newComment = {
        id: Date.now().toString(),
        tema_id: temaId,
        text: text,
        display_name: customName ? customName : traits.name,
        bg_color: traits.color,
        icon_url: traits.icon,
        date: new Date().toLocaleDateString('pt-BR'),
        parent_id: parentId || null,
        author_token: getAuthorToken()
    };

    await _sb.from('comments').insert(newComment);
    renderComments(temaId);
}

async function renderComments(temaId) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    const { data, error } = await _sb
        .from('comments')
        .select('*')
        .eq('tema_id', temaId);

    if (error || !data) return;

    commentsList.innerHTML = '';

    const parents = data.filter(c => !c.parent_id);
    const repliesMap = {};
    data.filter(c => c.parent_id).forEach(c => {
        if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
        repliesMap[c.parent_id].push(c);
    });

    parents.sort((a, b) => {
        const repsA = repliesMap[a.id] ? repliesMap[a.id].length : 0;
        const repsB = repliesMap[b.id] ? repliesMap[b.id].length : 0;
        if (repsA !== repsB) return repsB - repsA;
        return Number(b.id) - Number(a.id);
    });

    for (const key in repliesMap) {
        repliesMap[key].sort((a, b) => Number(a.id) - Number(b.id));
    }

    parents.forEach(p => {
        const threadDiv = document.createElement('div');
        threadDiv.className = 'comment-thread';
        threadDiv.appendChild(createCommentNode(p, temaId));

        if (repliesMap[p.id]) {
            const repliesDiv = document.createElement('div');
            repliesDiv.className = 'comment-replies';
            repliesMap[p.id].forEach(r => {
                repliesDiv.appendChild(createCommentNode(r, temaId, true));
            });
            threadDiv.appendChild(repliesDiv);
        }

        commentsList.appendChild(threadDiv);
    });
}

function createCommentNode(c, temaId, isReply = false) {
    const el = document.createElement('div');
    el.className = 'comment-card';

    el.innerHTML = `
        <div class="comment-header">
            <div class="comment-avatar" style="background-color: ${c.bg_color};">
                <img src="${c.icon_url}" alt="${c.display_name}">
            </div>
            <div class="comment-author">${c.display_name}</div>
        </div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-timestamp">${c.date}</div>
    `;

    const actionDiv = document.createElement('div');
    actionDiv.className = 'comment-reply-action';

    const btnReply = document.createElement('button');
    btnReply.className = 'btn-outline btn-small';
    btnReply.innerText = 'Responder';

    const replyInputArea = document.createElement('div');
    replyInputArea.className = 'comment-input-area';
    replyInputArea.style.display = 'none';
    replyInputArea.style.marginTop = '16px';
    replyInputArea.innerHTML = `
        <div class="input-area-header">
            <div class="avatar-preview" style="background-color: #8190F8;"></div>
            <textarea class="input-name reply-input-name" placeholder="Você quer se identificar? Se não, deixe aqui em branco" autocomplete="off" maxlength="30" rows="2" style="resize: none;"></textarea>
        </div>
        <textarea class="input-body reply-input-body" placeholder="Escreva sua resposta..." rows="2"></textarea>
        <div class="input-actions">
            <button class="btn-cancel reply-cancel">Cancelar</button>
            <button class="btn-outline btn-small reply-publish">Publicar</button>
        </div>
    `;

    btnReply.onclick = () => {
        btnReply.style.display = 'none';
        replyInputArea.style.display = 'block';
        replyInputArea.querySelector('.reply-input-body').focus();
    };

    replyInputArea.querySelector('.reply-cancel').onclick = () => {
        replyInputArea.style.display = 'none';
        replyInputArea.querySelector('.reply-input-name').value = '';
        replyInputArea.querySelector('.reply-input-body').value = '';
        btnReply.style.display = 'flex';
    };

    const publishReplyObj = replyInputArea.querySelector('.reply-publish');
    const inputBodyObj = replyInputArea.querySelector('.reply-input-body');

    publishReplyObj.onclick = async () => {
        const text = inputBodyObj.value.trim();
        if (!text) return;
        const name = replyInputArea.querySelector('.reply-input-name').value.trim();
        const parentThreadId = c.parent_id ? c.parent_id : c.id;
        publishReplyObj.disabled = true;
        await addComment(temaId, text, name, parentThreadId);
        publishReplyObj.disabled = false;
    };

    inputBodyObj.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            publishReplyObj.click();
        }
    });

    actionDiv.appendChild(btnReply);

    // Deletar: próprio autor pelo token, ou admin mode ativo
    const myToken = localStorage.getItem('JBResearch_AuthorToken');
    if (isAdminMode || (c.author_token && c.author_token === myToken)) {
        const btnDelete = document.createElement('button');
        btnDelete.type = 'button';
        btnDelete.className = 'btn-cancel';
        btnDelete.style.marginLeft = '12px';
        btnDelete.style.cursor = 'pointer';
        btnDelete.innerText = 'Deletar';
        btnDelete.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (btnDelete.innerText === 'Deletar') {
                btnDelete.innerText = 'Certeza?';
                btnDelete.style.color = '#F44336';
                setTimeout(() => {
                    if (document.contains(btnDelete)) {
                        btnDelete.innerText = 'Deletar';
                        btnDelete.style.color = '';
                    }
                }, 3000);
            } else {
                btnDelete.disabled = true;
                if (isAdminMode) {
                    await _sb.rpc('admin_delete_comment', { p_id: c.id, p_admin: _ADM });
                } else {
                    await _sb.rpc('delete_comment', { p_id: c.id, p_token: myToken });
                }
                renderComments(temaId);
            }
        };
        actionDiv.appendChild(btnDelete);
    }

    el.appendChild(actionDiv);
    el.appendChild(replyInputArea);

    return el;
}
