// Catalog text for the import tests: one collection and a valid suit file per design ID.
export const COLLECTION = `---
collection: dhanak
title: Dhanak
prefix: DHN
source_file: Dhanak/details.md
volume_style: 3 Piece
collection_type: Premium
dress_categories: [Unstitched Suits]
fabric: Dhanak
piece_details:
  - { piece: shirt, fabric: Dhanak, finish: Embroidered }
design: [Embroidered, Printed]
season: Winter
outfit_style:
---
# Dhanak collection

## Left out

- \`Dhanak/out.mp4\`: ends on another brand's card.
`;

export const suitText = (id: string, extra = '') => `---
design_id: ${id}
collection: dhanak
status: draft
price:
name: Teal Embroidered Dhanak 3-Piece Suit ${id}
slug: teal-embroidered-dhanak-3-piece-${id.toLowerCase()}
volume_style: 3 Piece
dress_categories: [Unstitched Suits]
collection_type: Premium
fabric: Dhanak
piece_details:
  - { piece: shirt, fabric: Dhanak, finish: Embroidered }
design: [Embroidered]
season: Winter
outfit_style: Traditional Suit
main_color: Teal
color_family: Teal
accent_colors: [Aqua]
motifs: [small flower sprigs]
photos:
  - file: Dhanak/${id.toLowerCase()}.jpeg
    alt: "Model wearing a teal 3-piece Dhanak suit"
videos:
  - file: Dhanak/${id.toLowerCase()}.mp4
    alt: "Short video of the teal suit, muted"
also_in_this_design: []
check: []
${extra}---
A teal unstitched 3-piece Dhanak suit for winter.
`;
