const { ipcRenderer } = require('electron');

class DataChecker {
    constructor() {
        this.currentSelect = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('select-folder').addEventListener('click', () => {
            ipcRenderer.send('select-folder');
        });

        document.getElementById('mark-finished').addEventListener('click', () => {
            if (this.folderPath) {
                ipcRenderer.send('mark-finished', { path: this.folderPath });
            }
        });

        ipcRenderer.on('folder-selected', (event, data) => this.handleFolderSelection(data));
        ipcRenderer.on('folder-marked-finished', (event, newPath) => {
            this.clearPageContent();
        });
    }

    handleFolderSelection(data) {
        this.folderPath = data.path;
        const selectedFolder = document.getElementById('selected-folder');
        let content = `<p>Selected folder: ${data.path}</p>`;
        
        if (data.parentFileCount) {
            const progressRatio = data.parentFileCount.finished / data.parentFileCount.total;
            document.getElementById('mark-progress').value = progressRatio;
            document.getElementById('progress-text').textContent = `${data.parentFileCount.finished} / ${data.parentFileCount.total} files finished`;
        }
        
        if (data.jsonData && data.jsonData.length > 0) {
            content += this.renderJsonFiles(data.jsonData);
        } else {
            content += '<p>No JSON files found in the selected folder.</p>';
        }
        
        selectedFolder.innerHTML = content;
        selectedFolder.style.display = 'block';
    }

    renderJsonFiles(jsonData) {
        jsonData.forEach(file => {
            if (file.error) {
            } else {
                document.getElementById('instr').innerText = file.data.instruction;
                if (file.data.steps) {
                    this.displaySteps(file.data.steps);
                }
            }
        });
        return "";
    }

    clearPageContent() {
        const stepList = document.getElementById('step-list');
        const stepImages = document.getElementById('step-images');
        const selectedFolder = document.getElementById('selected-folder');
        const instructionDisplay = document.getElementById('instruction-display');
        stepList.innerHTML = '';
        stepImages.innerHTML = '';
        selectedFolder.innerHTML = '';
        instructionDisplay.innerHTML = '';

        this.currentSelect = null;
    }

    displaySteps(steps) {
        const stepList = document.getElementById('step-list');
        const stepImages = document.getElementById('step-images');
        
        stepList.innerHTML = '';
        stepImages.innerHTML = '';
        
        // Store steps data for later use
        this.stepsData = steps;
        
        steps.forEach(step => {
            this.createStepItem(step, stepList);
            this.createStepImage(step, stepImages);
        });
        
        if (steps.length > 0) {
            this.selectStep(steps[0].step_id);
        }
    }

    // create step item on side bar
    createStepItem(step, stepList) {
        const stepItem = document.createElement('div');
        stepItem.className = 'step-item';
        stepItem.textContent = `Step ${step.step_id}`;
        stepItem.addEventListener('click', () => this.selectStep(step.step_id));
        stepList.appendChild(stepItem);

        // Add divider after each step item except the last one
        const divider = document.createElement('md-divider');
        divider.setAttribute('inset', '');
        stepList.appendChild(divider);
    }

    createStepImage(step, stepImages) {
        const img = document.createElement('img');
        img.src = `file://${this.folderPath}/step_${step.step_id}.jpg`;
        img.id = `step-image-${step.step_id}`;
        img.className = 'step-image';
        img.style.width = '40%';
        stepImages.appendChild(img);
    }

    onInstructionChange() {
        const selectedStep = this.stepsData.find(step => step.step_id === this.currentSelect);
        const instructionDisplay = document.getElementById('instruction-display');

        instructionDisplay.style.border = '2px solid green';

        // Update the instruction in the data
        selectedStep['low-level_instruction'] = instructionDisplay.textContent;
        // Send updated data to main process
        ipcRenderer.send('update-json', {
            path: this.folderPath,
            stepId: this.currentSelect,
            instruction: instructionDisplay.textContent
        });
    }

    selectStep(stepId) {
        console.log(stepId);
        this.currentSelect = stepId;
        const stepItems = document.querySelectorAll('.step-item');
        stepItems.forEach(item => {
            if (item.textContent === `Step ${stepId}`) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        const stepImages = document.querySelectorAll('.step-image');
        stepImages.forEach(img => {
            if (img.id === `step-image-${stepId}`) {
                img.classList.add('active');
            } else {
                img.classList.remove('active');
            }
        });

        // Update instruction display
        const selectedStep = this.stepsData.find(step => step.step_id === stepId);
        const instructionDisplay = document.getElementById('instruction-display');
        
        if (selectedStep && selectedStep['low-level_instruction']) {
            instructionDisplay.textContent = selectedStep['low-level_instruction'];
            instructionDisplay.style.display = 'block';
            instructionDisplay.contentEditable = true;

            // Add event listeners for editing states if not already added
            if (!instructionDisplay.hasEventListener) {
                instructionDisplay.addEventListener('input', () => {
                    instructionDisplay.style.border = '2px solid red';
                });

                instructionDisplay.addEventListener('blur', () => {
                    this.onInstructionChange();
                });

                instructionDisplay.hasEventListener = true;
            }
        } else {
            instructionDisplay.style.display = 'none';
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataChecker();
});