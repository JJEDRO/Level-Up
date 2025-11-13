# 🔥 Forge Quiz - Battle of Knowledge

A turn-based word quiz game themed around the word "forged" with an intense fire/forge aesthetic.

## 🎮 Game Features

### Core Mechanics
- **Turn-Based Gameplay**: Team Blue vs Team Red alternate turns
- **7 Questions**: Progressive difficulty with point values from 100 to 700
- **Player Choice**: Teams select which question to answer
- **Pressure Timer**: 30-second countdown on each question
- **Turn Switching**: Wrong answers pass control to the other team
- **Fire Theme**: Immersive forge/fire visual design

### Question Board
Questions are displayed as cards with point values:
- **100 Points** - Basic metalworking knowledge
- **200 Points** - Idioms and phrases
- **300 Points** - Popular culture reference
- **400 Points** - Technical knowledge
- **500 Points** - Vocabulary understanding
- **600 Points** - Legal terminology
- **700 Points** - Fantasy/literature trivia

## 🎯 How to Play

### Starting the Game
1. Open `forge-quiz.html` in a web browser
2. Game starts with Team Blue's turn
3. 30-second timer begins counting down

### Answering Questions
1. Click on any available question card (100-700 points)
2. Read the question in the modal that appears
3. Type your answer in the input field
4. Click "Submit Answer" or press Enter
5. Timer continues during question answering

### Scoring Rules
- **Correct Answer**: Team earns the question's point value and continues playing
- **Wrong Answer**: No points awarded, turn passes to the other team
- **Timeout**: If timer reaches 0 during a question, answer is marked wrong

### Winning the Game
- Game ends when all 7 questions are answered
- Team with the highest score wins
- Tied scores result in a draw

## 📋 Question List

All questions relate to the theme of "forged":

1. **100 pts**: What does 'forged' mean in metalworking?
   - Answer: Shaped, formed, hammered, or created

2. **200 pts**: Complete the phrase: 'A friendship forged in...'
   - Answer: Fire, battle, hardship, or adversity

3. **300 pts**: Famous TV show about bladesmiths who forge weapons?
   - Answer: Forged in Fire

4. **400 pts**: Temperature range steel is typically forged at (Fahrenheit)?
   - Answer: 2000-2400°F

5. **500 pts**: What does it mean when someone 'forges ahead'?
   - Answer: To move forward or continue despite difficulties

6. **600 pts**: What crime involves creating a forged document?
   - Answer: Forgery, counterfeiting, or fraud

7. **700 pts**: Where was the One Ring forged in Lord of the Rings?
   - Answer: Mount Doom (in Mordor)

## 🎨 Design Features

### Fire/Forge Theme
- **Color Palette**: Reds, oranges, yellows, and dark backgrounds
- **Animations**: Flickering fire effects, glowing text
- **Typography**: Bold, impactful fonts with fire shadows
- **Visual Effects**: Pulsing timer, glowing borders, animated cards

### Team Colors
- **Team Blue**: Cool blue tones with cyan highlights
- **Team Red**: Hot red tones with orange highlights
- Both teams have fire-themed accents

### Responsive Design
- Desktop-optimized layout
- Mobile-friendly interface
- Touch-friendly buttons
- Readable text at all sizes

## 🔧 Technical Details

### File Structure
- Single HTML file (`forge-quiz.html`)
- Embedded CSS styling
- Embedded JavaScript logic
- No external dependencies

### Game State Management
```javascript
gameState = {
    currentTeam: 'blue' | 'red',
    blueScore: number,
    redScore: number,
    answeredQuestions: Set<number>,
    currentQuestion: object,
    timerInterval: interval,
    timeRemaining: number
}
```

### Answer Validation
- Case-insensitive matching
- Accepts multiple valid answers per question
- Partial word matching for flexibility
- Clear feedback for correct/incorrect answers

## 🚀 Quick Start

### Option 1: Direct File
```bash
# Open directly in browser
open forge-quiz.html
```

### Option 2: Local Server
```bash
# Start a simple HTTP server
python -m http.server 8080

# Navigate to:
http://localhost:8080/forge-quiz.html
```

### Option 3: GitHub Pages
1. Upload to GitHub repository
2. Enable GitHub Pages
3. Access via: `https://username.github.io/repo/forge-quiz.html`

## 🎓 Educational Value

The quiz covers multiple aspects of the word "forged":

1. **Literal Meaning**: Metalworking and blacksmithing
2. **Metaphorical Use**: Relationships and character building
3. **Popular Culture**: TV shows and entertainment
4. **Technical Knowledge**: Temperature and process details
5. **Vocabulary**: Understanding different contexts
6. **Legal Context**: Forgery and fraud
7. **Literature**: Fantasy references

## 🎪 Game Variations

### Easy Mode
- Increase timer to 60 seconds
- Show hints for each question
- Allow multiple attempts

### Hard Mode
- Decrease timer to 20 seconds
- Require exact answers (no partial matching)
- Deduct points for wrong answers

### Team Play
- Form actual teams of multiple players
- Discuss answers together before submitting
- Alternate team members answering

### Solo Challenge
- Play against the clock
- Try to answer all questions correctly
- Beat your personal best time

## 🐛 Known Limitations

- Single-player switching between teams (honor system)
- No persistent score storage
- No difficulty levels (could be added)
- Limited to 7 pre-defined questions

## 🔮 Future Enhancements

Potential additions:
- [ ] Multiple quiz topics
- [ ] Difficulty selection
- [ ] High score persistence
- [ ] Sound effects
- [ ] Question randomization
- [ ] Multiplayer online mode
- [ ] Additional question packs
- [ ] Category selection
- [ ] Customizable timer
- [ ] Achievement system

## 📱 Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS/Android)

## 🎉 Credits

Created for the Level-Up fitness app as an educational word game focusing on the theme of "forged" - representing the forging of strength, knowledge, and character through challenge and perseverance.

## 📄 License

Part of the Level-Up project - MIT License

---

**Ready to test your knowledge?** 🔥 [Play Now](forge-quiz.html) 🔥
