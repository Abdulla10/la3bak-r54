/* Fixed visual previews from supplied package; not final approved artwork. No balances or prices. */
const gradients=Object.freeze({
  "bg_01": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_02": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_03": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_04": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_05": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_06": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_07": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_08": "linear-gradient(135deg,#211331,#79519a,#d8ad60)",
  "bg_09": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_10": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_11": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_12": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_13": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_14": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_15": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_16": "linear-gradient(135deg,#160f20,#8b3d39,#e7a04a)",
  "bg_17": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_18": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_19": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_20": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_21": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_22": "linear-gradient(135deg,#090d28,#55368c,#d477d6)",
  "bg_23": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_24": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_25": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_26": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_27": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_28": "linear-gradient(135deg,#10352e,#388a77,#d0dca4)",
  "bg_29": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_30": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_31": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_32": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_33": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_34": "linear-gradient(135deg,#21152e,#76528a,#dfb879)",
  "bg_35": "linear-gradient(135deg,#0b102a,#6235a8,#ed55bd)",
  "bg_36": "linear-gradient(135deg,#0b102a,#6235a8,#ed55bd)",
  "bg_37": "linear-gradient(135deg,#0b102a,#6235a8,#ed55bd)",
  "bg_38": "linear-gradient(135deg,#0b102a,#6235a8,#ed55bd)",
  "bg_39": "linear-gradient(135deg,#0b102a,#6235a8,#ed55bd)",
  "bg_40": "linear-gradient(135deg,#10102e,#3657a6,#ed55bd)"
});
export const isSuppliedBackground=id=>Object.hasOwn(gradients,String(id));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function backgroundVisual(item,cls='cx-fill'){
 const id=typeof item==='string'?item:item?.id;
 if(!isSuppliedBackground(id))return '';
 // Artwork only uses a server-provided same-origin path after approval. Empty by default.
 const art=typeof item?.art==='string'&&/^\/preview\/assets\/backgrounds\/bg_\d{2}\.(?:webp|png|jpg)$/.test(item.art)?item.art:null;
 return art?`<img class="${esc(cls)} lb-bg-art" src="${esc(art)}" alt="">`:`<i class="${esc(cls)} lb-bg-art" data-bg-placeholder="${esc(id)}" style="background-image:${esc(gradients[id])}"></i>`;
}
