document.addEventListener('DOMContentLoaded', () => {
    /**
     * Initializes tab functionality for a given container.
     * @param {string} containerId The ID of the container holding the tabs.
     */
    function setupTabs(containerId) {
        const tabContainer = document.getElementById(containerId);
        if (!tabContainer) {
            console.warn(`Tab container with ID "${containerId}" not found.`);
            return;
        }

        const tabButtons = tabContainer.querySelectorAll('.tab-button');
        const contentPanes = tabContainer.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Get the target pane's ID from the data-target attribute
                const targetId = button.getAttribute('data-target');

                // Deactivate all buttons and panes within this specific container
                tabButtons.forEach(btn => btn.classList.remove('active'));
                contentPanes.forEach(pane => pane.classList.remove('active'));

                // Activate the clicked button
                button.classList.add('active');

                // Activate the corresponding content pane
                const targetPane = tabContainer.querySelector(targetId);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    }

    // Initialize all tab groups on the page
    setupTabs('guide-video-tabs');
    setupTabs('command-log-tabs');

    /**
     * Initializes a hybrid dropdown with internal tabs.
     * @param {string} dropdownId The ID of the dropdown container.
     */
    function setupHybridDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        const trigger = dropdown.querySelector('.dropdown-trigger');
        const menu = dropdown.querySelector('.dropdown-menu');
        const triggerText = trigger.querySelector('.trigger-text');

        // 1. Handle opening/closing the main dropdown
        trigger.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // 2. Handle the tabs inside the menu
        const typeTabs = menu.querySelectorAll('.type-tab');
        const commandLists = menu.querySelectorAll('.command-list');

        typeTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent menu from closing when a tab is clicked
                typeTabs.forEach(t => t.classList.remove('active'));
                commandLists.forEach(l => l.classList.remove('active'));
                tab.classList.add('active');
                const targetList = menu.querySelector(tab.dataset.target);
                if (targetList) targetList.classList.add('active');
            });
        });

        // 3. Handle clicking a command in the list
        menu.querySelectorAll('.command-list a').forEach(commandLink => {
            commandLink.addEventListener('click', (event) => {
                event.preventDefault();
                const commandValue = commandLink.dataset.value;
                // Get only the main text, ignoring badge text
                const mainText = commandLink.querySelector('.command-link-title').textContent.trim();
                triggerText.textContent = mainText;
                
                console.log(`Selected command: ${commandValue}`);
                renderCommand(commandValue); // Update the command constructor
                dropdown.classList.remove('active'); // Close dropdown on selection
            });
        });
    }

    // Global listener to close dropdown when clicking outside
    document.addEventListener('click', () => {
        const activeDropdown = document.querySelector('.custom-dropdown.active');
        if (activeDropdown) {
            activeDropdown.classList.remove('active');
        }
    });

    // Initialize the hybrid dropdown
    setupHybridDropdown('ffmpeg-options-dropdown');

    const commandConstructor = document.getElementById('command-constructor');
    const commandTemplates = {
        'default': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
                { text: '', desc: 'Tùy chọn', copyable: true },
                { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
            ]
        },
        'vid_compress_h264_medium': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
                { text: '-c:v libx264 -crf 28 -preset medium -movflags +faststart -c:a aac -b:a 128k', desc: 'Tùy chọn', copyable: true },
                { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
            ]
        },
        'vid_compress_h264_max': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
                { text: '-c:v libx264 -crf 30 -preset medium -movflags +faststart -c:a aac -b:a 128k', desc: 'Tùy chọn', copyable: true },
                { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
            ]
        },
        'vid_to_gif': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
                { text: '-vf "fps=10,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"', desc: 'Tùy chọn', copyable: true },
                { text: 'output.gif', desc: 'File đầu ra', copyable: false }
            ]
        },
        'vid_compress_h265': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'input.mp4', desc: 'File đầu vào', copyable: false },
                { text: '-vcodec libx265 -acodec aac -crf 28', desc: 'Tùy chọn', copyable: true },
                { text: 'output.mp4', desc: 'File đầu ra', copyable: false }
            ],
            warning: 'Lưu ý: Video dùng codec H.265 (libx265) sẽ không chạy được trên hầu hết các trình duyệt web (như Chrome, Firefox) và sẽ gây ra lỗi màn hình đen.'
        },
        'img_to_webp': {
            command: [
                { text: '-i', desc: 'Lệnh mặc định', copyable: false },
                { text: 'image.png', desc: 'File đầu vào', copyable: false },
                { text: '', desc: 'Tùy chọn', copyable: true },
                { text: 'output.webp', desc: 'File đầu ra', copyable: false }
            ]
        }
    };

    function renderCommand(templateKey = 'default') {
        const template = commandTemplates[templateKey] || commandTemplates['default'];
        const parts = template.command;
        const warning = template.warning;

        const container = commandConstructor.querySelector('.command-parts-container');
        container.innerHTML = parts.map(part => {
            const isCopyable = part.copyable !== false;
            const disabledClass = isCopyable ? '' : 'disabled';
            return `
            <div class="command-part ${disabledClass}">
                <code>${part.text || '&nbsp;'}</code>
                <p class="part-description">${part.desc}</p>
                <div class="copy-tooltip">Đã sao chép!</div>
            </div>
        `}).join('');
        
        const warningContainer = document.getElementById('command-warning');
        if (warning) {
            warningContainer.textContent = warning;
            warningContainer.classList.add('visible');
        } else {
            warningContainer.textContent = '';
            warningContainer.classList.remove('visible');
        }
    }

    // Handle clicks on command parts for copying
    commandConstructor.addEventListener('click', (event) => {
        if (event.target.tagName === 'CODE') {
            const commandPartDiv = event.target.closest('.command-part');
            if (commandPartDiv.classList.contains('disabled')) {
                return; // Do nothing if the part is disabled
            }

            const textToCopy = event.target.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const tooltip = commandPartDiv.querySelector('.copy-tooltip');
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
                setTimeout(() => {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    });

    // Initial render
    renderCommand();
});
