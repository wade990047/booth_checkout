// Publish only frontend assets. Never include backups, tests, docs or tools.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.pages');
if(fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw Error('Output must not be a symbolic link');
fs.mkdirSync(out,{recursive:true});
const allowed=new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.webp','.gif','.ico','.woff','.woff2']);
function copy(from,to){const stat=fs.lstatSync(from);if(stat.isSymbolicLink())throw Error('Symbolic links are not published: '+from);if(stat.isDirectory()){for(const entry of fs.readdirSync(from))copy(path.join(from,entry),path.join(to,entry))}else if(allowed.has(path.extname(from).toLowerCase())){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to)}}
for(const name of ['index.html','pages','shared','features','assets'])copy(path.join(root,name),path.join(out,name));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log('Frontend prepared in .pages; backups and local data excluded.');
