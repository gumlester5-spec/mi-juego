const word = "COMO";
const guesses = ['O', 'O', 'O'];
const letter = 'O';
const guessedCount = guesses.filter(l => l === letter).length;
const wordCount = word.split('').filter(l => l === letter).length;
console.log(guessedCount > wordCount);
