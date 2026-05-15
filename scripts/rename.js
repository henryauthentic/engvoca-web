const fs = require('fs');
const path = require('path');
function replaceInDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content
        .replace(/VocabMaster/g, 'ENG VOCA')
        .replace(/VocabAdmin/g, 'ENG VOCA')
        .replace(/Vocab<span className="text-purple-500">Admin<\/span>/g, 'ENG <span className="text-purple-500">VOCA<\/span>')
        .replace(/Vocab<span className="text-primary-600">Master<\/span>/g, 'ENG <span className="text-primary-600">VOCA<\/span>')
        .replace(/vocabmaster\.com/g, 'engvoca.com');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated', fullPath);
      }
    }
  });
}
replaceInDir('src');
