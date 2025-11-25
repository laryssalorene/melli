console.log("Executing new crossword.js - v2");
document.addEventListener('DOMContentLoaded', () => {
    const words = [
        { word: 'GLICOSE', clue: 'Principal fonte de energia para o corpo.' },
        { word: 'INSULINA', clue: 'Hormônio que ajuda a glicose a entrar nas células.' },
        { word: 'DIABETES', clue: 'Condição em que o corpo não produz ou não usa insulina adequadamente.' },
        { word: 'HIPOGLICEMIA', clue: 'Nível baixo de açúcar no sangue.' },
        { word: 'HIPERGLICEMIA', clue: 'Nível alto de açúcar no sangue.' },
        { word: 'ENERGIA', clue: 'O que a glicose fornece ao corpo.' },
        { word: 'ACUCAR', clue: 'Substância doce que se transforma em glicose no corpo.' },
        { word: 'CELULAS', clue: 'As "casas" do corpo que precisam de energia.' },
        { word: 'SANGUE', clue: 'Transporta a glicose pelo corpo.' },
        { word: 'TRATAMENTO', clue: 'Conjunto de cuidados para controlar o diabetes.' },
        { word: 'EXERCICIOS', clue: 'Atividade física que ajuda a controlar o açúcar no sangue.' },
        { word: 'ALIMENTACAO', clue: 'Dieta e nutrição para diabéticos.' },
        { word: 'MEDIR', clue: 'Verificar o nível de glicose no sangue.' },
        { word: 'SINTOMAS', clue: 'Sinais de hipoglicemia ou hiperglicemia.' },
    ];

    const gridElement = document.getElementById('crossword');
    const acrossCluesList = document.getElementById('across-clues-list');
    const downCluesList = document.getElementById('down-clues-list');
    const checkPuzzleButton = document.getElementById('check-puzzle');

    const gridSize = 20;
    let grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));

    function generateCrossword() {
        words.sort((a, b) => b.word.length - a.word.length);

        // Place the first word
        const firstWord = words[0];
        const startRow = Math.floor(gridSize / 2);
        const startCol = Math.floor((gridSize - firstWord.word.length) / 2);
        console.log(`Placing first word '${firstWord.word}' at [${startRow}, ${startCol}]`);
        placeWord(firstWord, startRow, startCol, 'across', 1);

        let wordNumber = 2;
        for (let i = 1; i < words.length; i++) {
            const wordToPlace = words[i];
            let placed = false;

            // Try to place this word by finding an intersection
            for (let j = 0; j < i; j++) {
                const placedWord = words[j];
                if (!placedWord.direction) continue;

                const intersection = findIntersection(wordToPlace, placedWord);

                if (intersection) {
                    let newRow, newCol, newDirection;
                    if (placedWord.direction === 'across') {
                        newDirection = 'down';
                        newRow = placedWord.row - intersection.charIndex1;
                        newCol = intersection.col;
                    } else {
                        newDirection = 'across';
                        newRow = intersection.row;
                        newCol = placedWord.col - intersection.charIndex1;
                    }
                    
                    console.log(`Trying to place '${wordToPlace.word}' at [${newRow}, ${newCol}] ${newDirection} intersecting with '${placedWord.word}'`);

                    if (canPlaceWord(wordToPlace, newRow, newCol, newDirection)) {
                        console.log(`Successfully placed '${wordToPlace.word}'`);
                        placeWord(wordToPlace, newRow, newCol, newDirection, wordNumber++);
                        placed = true;
                        break; 
                    }
                }
            }
             if (!placed) {
                console.log(`Could not place '${wordToPlace.word}'`);
            }
        }
        console.log("Grid after generation:", grid);
    }

    function placeWord(wordObj, row, col, direction, number) {
        wordObj.row = row;
        wordObj.col = col;
        wordObj.direction = direction;
        wordObj.number = number;

        for (let i = 0; i < wordObj.word.length; i++) {
            let r = row;
            let c = col;
            if (direction === 'across') {
                c += i;
            } else {
                r += i;
            }
            if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
                console.error("Out of bounds in placeWord!", {r,c});
                return;
            }
            grid[r][c] = { letter: wordObj.word[i], word: wordObj };
        }
    }

    function findIntersection(wordToPlace, placedWord) {
        for (let i = 0; i < wordToPlace.word.length; i++) {
            const charToPlace = wordToPlace.word[i];
            for (let j = 0; j < placedWord.word.length; j++) {
                const placedChar = placedWord.word[j];
                if (charToPlace === placedChar) {
                    if (placedWord.direction === 'across') {
                        return { charIndex1: i, charIndex2: j, row: placedWord.row, col: placedWord.col + j };
                    } else { // down
                        return { charIndex1: i, charIndex2: j, row: placedWord.row + j, col: placedWord.col };
                    }
                }
            }
        }
        return null;
    }

    function canPlaceWord(wordObj, row, col, direction) {
        // console.log(`canPlaceWord check for '${wordObj.word}' at [${row}, ${col}] ${direction}`);
        if (row < 0 || col < 0) return false;

        if (direction === 'across') {
            if (col + wordObj.word.length > gridSize) return false;
        }
        else { // 'down'
            if (row + wordObj.word.length > gridSize) return false;
        }

        let intersects = false;
        for (let i = 0; i < wordObj.word.length; i++) {
            let r = row;
            let c = col;
            if (direction === 'across') {
                c += i;
            }
            else {
                r += i;
            }

            if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
                console.error(`Out of bounds access attempt in canPlaceWord at [${r}, ${c}]`);
                return false;
            }
            
            // This is where the error is likely happening
            if (!grid[r]) {
                console.error(`grid[${r}] is undefined!`);
                return false;
            }

            const cell = grid[r][c];

            if (cell) { // There's a letter here
                if (cell.letter !== wordObj.word[i]) {
                    return false; // Conflict
                } else {
                    intersects = true; // It's a valid intersection
                }
            }
        }
        
        return intersects;
    }


    function renderCrossword() {
        gridElement.innerHTML = '';
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                if (grid[r][c]) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.dataset.row = r;
                    input.dataset.col = c;
                    cell.appendChild(input);

                    const wordStart = words.find(w => w.row === r && w.col === c);
                    if (wordStart) {
                        const numberSpan = document.createElement('span');
                        numberSpan.classList.add('number');
                        numberSpan.textContent = wordStart.number;
                        cell.insertBefore(numberSpan, input);
                    }
                } else {
                    cell.classList.add('empty');
                }
                gridElement.appendChild(cell);
            }
        }
    }

    function renderClues() {
        acrossCluesList.innerHTML = '';
        downCluesList.innerHTML = '';
        
        const sortedWords = words.filter(w => w.direction).sort((a,b) => a.number - b.number);

        sortedWords.forEach(word => {
            const li = document.createElement('li');
            li.textContent = `${word.number}. ${word.clue}`;
            if (word.direction === 'across') {
                acrossCluesList.appendChild(li);
            } else {
                downCluesList.appendChild(li);
            }
        });
    }

    checkPuzzleButton.addEventListener('click', () => {
        const inputs = gridElement.querySelectorAll('input');
        inputs.forEach(input => {
            const row = parseInt(input.dataset.row);
            const col = parseInt(input.dataset.col);
            const correctLetter = grid[row][col].letter;
            if (input.value.toUpperCase() === correctLetter) {
                input.style.backgroundColor = 'lightgreen';
            } else {
                input.style.backgroundColor = 'lightcoral';
            }
        });
    });

    generateCrossword();
    renderCrossword();
    renderClues();
});
