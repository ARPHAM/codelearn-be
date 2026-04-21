import dataSource from '../data-source';
import { ProblemVersion } from '../modules/problem/entities/problem-version.entity';

function jsonToHtml(node: any): string {
  if (!node) return '';
  
  // If node is already a string (shouldn't happen in Tiptap JSON but for safety)
  if (typeof node === 'string') return node;

  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'code') text = `<code>${text}</code>`;
        if (mark.type === 'textStyle' && mark.attrs?.color) {
          text = `<span style="color: ${mark.attrs.color}">${text}</span>`;
        }
        if (mark.type === 'link' && mark.attrs?.href) {
          text = `<a href="${mark.attrs.href}" target="_blank">${text}</a>`;
        }
      });
    }
    return text;
  }
  
  const content = node.content ? node.content.map(jsonToHtml).join('') : '';
  
  switch (node.type) {
    case 'doc': return content;
    case 'paragraph': return `<p>${content}</p>`;
    case 'heading': return `<h${node.attrs?.level || 1}>${content}</h${node.attrs?.level || 1}>`;
    case 'bulletList': return `<ul>${content}</ul>`;
    case 'orderedList': return `<ol>${content}</ol>`;
    case 'listItem': return `<li>${content}</li>`;
    case 'blockquote': return `<blockquote>${content}</blockquote>`;
    case 'codeBlock': return `<pre><code>${content}</code></pre>`;
    case 'horizontalRule': return `<hr />`;
    case 'hardBreak': return `<br />`;
    default: return content;
  }
}

async function run() {
  console.log('--- STARTING MIGRATION ---');
  
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      console.log('Database connected.');
    }

    const versionRepo = dataSource.getRepository(ProblemVersion);
    
    // Find all versions where description is an object (Format B)
    // Note: jsonb_typeof is useful in SQL, but here we can check in JS too
    const allVersions = await versionRepo.find();
    console.log(`Found ${allVersions.length} total versions.`);

    let count = 0;
    for (const version of allVersions) {
      const desc = version.description;
      
      // Check if it's the Tiptap Object format (Snippet 2)
      if (desc && typeof desc === 'object' && !Array.isArray(desc) && desc.type === 'doc') {
        process.stdout.write(`Migrating version ${version.id}... `);
        
        try {
          const html = jsonToHtml(desc);
          // Convert to Format A: Array of blocks
          version.description = [
            { id: 'migrated-block', content: html }
          ];
          
          await versionRepo.save(version);
          console.log('DONE');
          count++;
        } catch (err) {
          console.log('FAILED');
          console.error(err);
        }
      }
    }

    console.log(`--- MIGRATION FINISHED. Migrated ${count} records. ---`);
  } catch (error) {
    console.error('Migration crashed:', error);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

run();
