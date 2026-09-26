// "What can I make with…": a curated ingredient catalog matched against the recipes' ingredient
// lines (public/data/search/documents.json, English text, one line per ingredient), then ranking
// by how many of a recipe's ingredients the user has ticked.
//
// Every ingredient line of every recipe must be recognised: src/test/pantry.test.ts lists the ones
// that are not. Patterns are English phrases, compared word by word after normalisation and light
// stemming (plurals fold), and the longest pattern wins ("coconut milk" beats "milk",
// "bell pepper" beats "pepper").
import { normalize, stem } from "@/lib/search/text"

export type PantryGroup = "produce" | "fruit" | "herbs" | "dairy" | "meat" | "starches" | "pantry" | "spices"

export const PANTRY_GROUPS: PantryGroup[] = ["produce", "fruit", "herbs", "dairy", "meat", "starches", "pantry", "spices"]

type Label = { fr: string; en: string; it: string }

export interface PantryItem {
  id: string
  group: PantryGroup
  label: Label
  match: string[]
}

/** Always assumed to be in the kitchen: never offered, never counted as missing. */
const STAPLES: string[] = [
  "salt", "fleur de sel", "coarse salt", "fine salt",
  "pepper", "black pepper", "ground pepper",
  "water", "pasta cooking water",
  "oil", "olive oil", "extra virgin olive oil", "extra-virgin olive oil", "sunflower oil", "neutral oil",
  "vegetable oil", "peanut oil", "rapeseed", "frying oil", "oil for frying",
  "fat", "parchment paper",
]

const item = (id: string, group: PantryGroup, fr: string, en: string, it: string, match: string[]): PantryItem => ({
  id,
  group,
  label: { fr, en, it },
  match,
})

export const PANTRY_ITEMS: PantryItem[] = [
  // Vegetables
  item("tomato", "produce", "Tomates", "Tomatoes", "Pomodori", ["tomato", "cherry tomato", "datterino tomato", "beef tomato", "beef heart tomato"]),
  item("canned-tomato", "produce", "Tomates en conserve", "Canned tomatoes", "Pomodori in scatola", [
    "peeled tomato", "canned peeled tomato", "canned datterino tomato", "crushed tomato", "canned crushed tomato",
    "passata", "tomato passata", "tomato sauce",
  ]),
  item("sun-dried-tomato", "produce", "Tomates séchées", "Sun-dried tomatoes", "Pomodori secchi", ["sun-dried tomato"]),
  item("onion", "produce", "Oignons", "Onions", "Cipolle", ["onion", "onion powder"]),
  item("spring-onion", "produce", "Oignons nouveaux", "Spring onions", "Cipollotti", ["spring onion", "scallion"]),
  item("shallot", "produce", "Échalotes", "Shallots", "Scalogni", ["shallot"]),
  item("garlic", "produce", "Ail", "Garlic", "Aglio", ["garlic", "garlic clove", "garlic powder"]),
  item("carrot", "produce", "Carottes", "Carrots", "Carote", ["carrot"]),
  item("zucchini", "produce", "Courgettes", "Zucchini", "Zucchine", ["zucchini", "courgette"]),
  item("eggplant", "produce", "Aubergines", "Eggplants", "Melanzane", ["eggplant", "aubergine"]),
  item("bell-pepper", "produce", "Poivrons", "Bell peppers", "Peperoni", ["bell pepper"]),
  item("potato", "produce", "Pommes de terre", "Potatoes", "Patate", ["potato"]),
  item("sweet-potato", "produce", "Patates douces", "Sweet potatoes", "Patate dolci", ["sweet potato"]),
  item("squash", "produce", "Courge butternut", "Butternut squash", "Zucca", ["butternut squash", "squash", "pumpkin"]),
  item("mushroom", "produce", "Champignons", "Mushrooms", "Funghi", ["mushroom", "porcini"]),
  item("spinach", "produce", "Épinards", "Spinach", "Spinaci", ["spinach"]),
  item("chard", "produce", "Blettes", "Swiss chard", "Bietole", ["swiss chard", "chard"]),
  item("asparagus", "produce", "Asperges", "Asparagus", "Asparagi", ["asparagus", "asparagus tip"]),
  item("broccoli", "produce", "Brocoli", "Broccoli", "Broccoli", ["broccoli"]),
  item("leek", "produce", "Poireaux", "Leeks", "Porri", ["leek"]),
  item("cucumber", "produce", "Concombre", "Cucumber", "Cetriolo", ["cucumber"]),
  item("radish", "produce", "Radis", "Radishes", "Ravanelli", ["radish"]),
  item("salad", "produce", "Salade", "Salad leaves", "Insalata", ["salad", "lettuce", "mesclun"]),
  item("rocket", "produce", "Roquette", "Rocket", "Rucola", ["rocket", "arugula"]),
  item("bamboo-shoot", "produce", "Pousses de bambou", "Bamboo shoots", "Germogli di bambù", ["bamboo shoot"]),
  item("ratatouille", "produce", "Ratatouille", "Ratatouille", "Ratatouille", ["ratatouille"]),
  item("lentils", "produce", "Lentilles", "Lentils", "Lenticchie", ["lentil"]),
  item("chickpeas", "produce", "Pois chiches", "Chickpeas", "Ceci", ["chickpea"]),
  item("peas", "produce", "Petits pois", "Peas", "Piselli", ["pea"]),
  item("green-beans", "produce", "Haricots verts", "Green beans", "Fagiolini", ["green bean"]),
  item("turnip", "produce", "Navets", "Turnips", "Rape", ["turnip"]),
  item("celery", "produce", "Céleri", "Celery", "Sedano", ["celery", "celery stalk"]),

  // Fruit
  item("lemon", "fruit", "Citrons", "Lemons", "Limoni", ["lemon", "lemon juice"]),
  item("lime", "fruit", "Citrons verts", "Limes", "Lime", ["lime"]),
  item("orange", "fruit", "Oranges", "Oranges", "Arance", ["orange", "orange juice"]),
  item("grapefruit", "fruit", "Pamplemousse", "Grapefruit", "Pompelmo", ["grapefruit"]),
  item("avocado", "fruit", "Avocats", "Avocados", "Avocado", ["avocado"]),
  item("banana", "fruit", "Bananes", "Bananas", "Banane", ["banana"]),
  item("apple", "fruit", "Pommes", "Apples", "Mele", ["apple"]),
  item("mango", "fruit", "Mangues", "Mangoes", "Mango", ["mango"]),
  item("pineapple", "fruit", "Ananas", "Pineapple", "Ananas", ["pineapple"]),
  item("passion-fruit", "fruit", "Fruits de la passion", "Passion fruit", "Frutto della passione", ["passion fruit"]),
  item("watermelon", "fruit", "Pastèque", "Watermelon", "Anguria", ["watermelon"]),
  item("melon", "fruit", "Melon", "Melon", "Melone", ["melon"]),
  item("raspberry", "fruit", "Framboises", "Raspberries", "Lamponi", ["raspberry", "raspberries", "raspberry coulis"]),
  item("raisins", "fruit", "Raisins secs", "Raisins", "Uvetta", ["raisin", "sultana", "currant"]),
  item("pear", "fruit", "Poires", "Pears", "Pere", ["pear"]),
  item("peach", "fruit", "Pêches", "Peaches", "Pesche", ["peach"]),
  item("strawberry", "fruit", "Fraises", "Strawberries", "Fragole", ["strawberry", "strawberries"]),
  item("cherry", "fruit", "Cerises", "Cherries", "Ciliegie", ["cherry", "cherries"]),
  item("redcurrant", "fruit", "Groseilles", "Redcurrants", "Ribes rosso", ["redcurrant"]),
  item("blackcurrant", "fruit", "Cassis", "Blackcurrants", "Ribes nero", ["blackcurrant"]),
  item("rhubarb", "fruit", "Rhubarbe", "Rhubarb", "Rabarbaro", ["rhubarb", "rhubarb stalk"]),
  item("quince", "fruit", "Coings", "Quinces", "Mele cotogne", ["quince"]),
  item("citrus", "fruit", "Agrumes", "Citrus fruits", "Agrumi", ["citrus fruit", "citrus"]),
  item("fruit-puree", "fruit", "Purée de fruits", "Fruit purée", "Purea di frutta", ["fruit puree", "fruit pulp", "red berry pulp", "red berry"]),
  item("prunes", "fruit", "Pruneaux", "Prunes", "Prugne secche", ["prune"]),

  // Herbs and aromatics
  item("basil", "herbs", "Basilic", "Basil", "Basilico", ["basil", "thai basil"]),
  item("parsley", "herbs", "Persil", "Parsley", "Prezzemolo", ["parsley"]),
  item("coriander", "herbs", "Coriandre fraîche", "Fresh coriander", "Coriandolo fresco", ["coriander", "cilantro"]),
  item("mint", "herbs", "Menthe", "Mint", "Menta", ["mint"]),
  item("chives", "herbs", "Ciboulette", "Chives", "Erba cipollina", ["chive"]),
  item("thyme", "herbs", "Thym", "Thyme", "Timo", ["thyme"]),
  item("rosemary", "herbs", "Romarin", "Rosemary", "Rosmarino", ["rosemary"]),
  item("oregano", "herbs", "Origan", "Oregano", "Origano", ["oregano"]),
  item("tarragon", "herbs", "Estragon", "Tarragon", "Dragoncello", ["tarragon"]),
  item("sage", "herbs", "Sauge", "Sage", "Salvia", ["sage", "sage leaf", "sage leave"]),
  item("chervil", "herbs", "Cerfeuil", "Chervil", "Cerfoglio", ["chervil"]),
  item("bouquet-garni", "herbs", "Bouquet garni", "Bouquet garni", "Mazzetto aromatico", ["bouquet garni"]),
  item("ginger", "herbs", "Gingembre", "Ginger", "Zenzero", ["ginger"]),
  item("chili", "herbs", "Piment", "Chili", "Peperoncino", [
    "chili", "chilli", "chili pepper", "chili flake", "espelette pepper", "espelette chili pepper", "cayenne",
    "cayenne pepper",
  ]),
  item("lemongrass", "herbs", "Citronnelle", "Lemongrass", "Citronella", ["lemongrass"]),
  item("kaffir-lime", "herbs", "Feuilles de combava", "Kaffir lime leaves", "Foglie di lime kaffir", ["kaffir lime leaf", "kaffir lime leave"]),

  // Dairy and eggs
  item("eggs", "dairy", "Œufs", "Eggs", "Uova", ["egg", "egg yolk", "egg white", "yolk", "quiche mixture"]),
  item("butter", "dairy", "Beurre", "Butter", "Burro", ["butter"]),
  item("ghee", "dairy", "Ghee", "Ghee", "Ghee", ["ghee"]),
  item("milk", "dairy", "Lait", "Milk", "Latte", ["milk", "bechamel", "bechamel sauce"]),
  item("cream", "dairy", "Crème liquide", "Cream", "Panna", ["cream", "heavy cream", "single cream", "light cream", "whipping cream", "liquid cream"]),
  item("creme-fraiche", "dairy", "Crème fraîche", "Crème fraîche", "Crème fraîche", ["creme fraiche"]),
  item("yogurt", "dairy", "Yaourt", "Yogurt", "Yogurt", ["yogurt", "yoghurt"]),
  item("parmesan", "dairy", "Parmesan", "Parmesan", "Parmigiano", ["parmesan", "parmigiano"]),
  item("pecorino", "dairy", "Pecorino", "Pecorino", "Pecorino", ["pecorino"]),
  item("mozzarella", "dairy", "Mozzarella", "Mozzarella", "Mozzarella", ["mozzarella"]),
  item("burrata", "dairy", "Burrata", "Burrata", "Burrata", ["burrata"]),
  item("ricotta", "dairy", "Ricotta", "Ricotta", "Ricotta", ["ricotta"]),
  item("mascarpone", "dairy", "Mascarpone", "Mascarpone", "Mascarpone", ["mascarpone"]),
  item("feta", "dairy", "Feta", "Feta", "Feta", ["feta"]),
  item("goat-cheese", "dairy", "Fromage de chèvre", "Goat cheese", "Formaggio di capra", ["goat cheese", "chilli goat cheese"]),
  item("cream-cheese", "dairy", "Fromage frais", "Cream cheese", "Formaggio spalmabile", ["cream cheese", "laughing cow"]),
  item("comte", "dairy", "Comté ou gruyère", "Comté or Gruyère", "Comté o groviera", ["comte", "gruyere", "grated cheese"]),
  item("cheddar", "dairy", "Cheddar", "Cheddar", "Cheddar", ["cheddar"]),
  item("provola", "dairy", "Provola", "Provola", "Provola", ["provola"]),

  // Meat
  item("chicken", "meat", "Poulet", "Chicken", "Pollo", ["chicken", "chicken breast"]),
  item("pork", "meat", "Porc", "Pork", "Maiale", ["pork", "pork tenderloin", "pork shoulder"]),
  item("sausage", "meat", "Saucisses", "Sausages", "Salsicce", ["sausage", "sausage meat"]),
  item("minced-meat", "meat", "Viande hachée", "Minced meat", "Carne macinata", ["minced meat", "ground beef"]),
  item("beef", "meat", "Bœuf", "Beef", "Manzo", ["beef", "marrow bone", "ox tongue"]),
  item("lamb", "meat", "Agneau", "Lamb", "Agnello", ["lamb"]),
  item("veal", "meat", "Veau", "Veal", "Vitello", ["veal", "calf s foot"]),
  item("duck", "meat", "Canard", "Duck", "Anatra", ["duck", "duck breast"]),
  item("foie-gras", "meat", "Foie gras", "Foie gras", "Foie gras", ["foie gras"]),
  item("ham", "meat", "Jambon", "Ham", "Prosciutto cotto", ["ham", "cooked ham", "prosciutto cotto"]),
  item("cured-ham", "meat", "Jambon cru", "Cured ham", "Prosciutto crudo", ["cured ham", "cured country ham", "speck"]),
  item("bacon", "meat", "Lardons", "Bacon", "Pancetta", ["bacon", "lardon", "bacon lardon", "bacon bit"]),
  item("guanciale", "meat", "Guanciale", "Guanciale", "Guanciale", ["guanciale"]),
  item("chorizo", "meat", "Chorizo", "Chorizo", "Chorizo", ["chorizo"]),
  item("falafel", "meat", "Falafels", "Falafels", "Falafel", ["falafel"]),

  // Starches
  item("pasta", "starches", "Pâtes", "Pasta", "Pasta", [
    "pasta", "spaghetti", "penne", "rigatoni", "bucatini", "macaroni", "orzo", "tuffoli", "fusilloni", "coquillette",
    "mafaldina", "tagliatelle", "shell pasta", "lentil pasta",
  ]),
  item("pasta-sheets", "starches", "Ravioles", "Ravioles", "Raviole", ["raviole", "ravioles", "raviole pasta sheet"]),
  item("gnocchi", "starches", "Gnocchis", "Gnocchi", "Gnocchi", ["gnocchi", "potato gnocchi"]),
  item("rice", "starches", "Riz", "Rice", "Riso", ["rice", "basmati", "arborio"]),
  item("rice-paper", "starches", "Galettes de riz", "Rice paper", "Carta di riso", ["rice paper", "rice paper sheet"]),
  item("flour", "starches", "Farine", "Flour", "Farina", ["flour", "wheat flour", "durum wheat flour"]),
  item("semolina", "starches", "Semoule", "Semolina", "Semola", ["semolina", "semola", "durum wheat semolina"]),
  item("polenta", "starches", "Polenta", "Polenta", "Polenta", ["polenta"]),
  item("barley", "starches", "Orge perlé", "Pearl barley", "Orzo perlato", ["pearl barley"]),
  item("oats", "starches", "Flocons d'avoine", "Oat flakes", "Fiocchi d'avena", ["oat flake", "oat"]),
  item("bread", "starches", "Pain", "Bread", "Pane", ["bread", "sandwich bread", "country bread", "pita", "pita bread"]),
  item("breadcrumbs", "starches", "Chapelure", "Breadcrumbs", "Pangrattato", ["breadcrumb", "panko"]),
  item("pastry", "starches", "Pâte brisée", "Shortcrust pastry", "Pasta brisée", ["shortcrust pastry"]),
  item("puff-pastry", "starches", "Pâte feuilletée", "Puff pastry", "Pasta sfoglia", ["puff pastry"]),
  item("biscuits", "starches", "Spéculoos", "Speculoos biscuits", "Biscotti speculoos", ["speculoos", "biscuit"]),

  // Pantry
  item("sugar", "pantry", "Sucre", "Sugar", "Zucchero", ["sugar", "icing sugar", "powdered sugar", "palm sugar", "sugar cube", "syrup", "glucose"]),
  item("vanilla", "pantry", "Vanille", "Vanilla", "Vaniglia", ["vanilla", "vanilla pod", "vanilla extract", "vanilla sugar"]),
  item("honey", "pantry", "Miel", "Honey", "Miele", ["honey"]),
  item("maple-syrup", "pantry", "Sirop d'érable", "Maple syrup", "Sciroppo d'acero", ["maple syrup"]),
  item("chocolate", "pantry", "Chocolat noir", "Dark chocolate", "Cioccolato fondente", ["chocolate", "dark chocolate"]),
  item("baking-powder", "pantry", "Levure chimique", "Baking powder", "Lievito per dolci", ["baking powder", "baking soda"]),
  item("yeast", "pantry", "Levure de boulanger", "Baker's yeast", "Lievito di birra", ["yeast", "baker s yeast"]),
  item("gelatin", "pantry", "Gélatine", "Gelatin", "Gelatina", ["gelatin", "gelatine"]),
  item("cornstarch", "pantry", "Maïzena", "Cornstarch", "Amido di mais", ["cornstarch", "cornflour"]),
  item("almond-extract", "pantry", "Extrait d'amande amère", "Bitter almond extract", "Estratto di mandorla amara", ["almond extract", "bitter almond extract"]),
  item("orange-blossom", "pantry", "Eau de fleur d'oranger", "Orange blossom water", "Acqua di fiori d'arancio", ["orange blossom water"]),
  item("food-colouring", "pantry", "Colorant alimentaire", "Food colouring", "Colorante alimentare", ["food colouring", "food coloring"]),
  item("broth", "pantry", "Bouillon", "Stock", "Brodo", ["stock", "broth", "chicken stock", "chicken broth", "vegetable stock", "beef stock", "chicken or vegetable stock"]),
  item("coconut-milk", "pantry", "Lait de coco", "Coconut milk", "Latte di cocco", ["coconut milk"]),
  item("tomato-paste", "pantry", "Concentré de tomates", "Tomato paste", "Concentrato di pomodoro", ["tomato paste", "tomato puree"]),
  item("soy-sauce", "pantry", "Sauce soja", "Soy sauce", "Salsa di soia", ["soy sauce"]),
  item("fish-sauce", "pantry", "Sauce nuoc-mâm", "Fish sauce", "Salsa di pesce", ["fish sauce"]),
  item("worcestershire", "pantry", "Sauce Worcestershire", "Worcestershire sauce", "Salsa Worcestershire", ["worcestershire", "worcestershire sauce"]),
  item("ketchup", "pantry", "Ketchup", "Ketchup", "Ketchup", ["ketchup"]),
  item("mustard", "pantry", "Moutarde", "Mustard", "Senape", ["mustard"]),
  item("vinegar", "pantry", "Vinaigre", "Vinegar", "Aceto", ["vinegar", "balsamic", "balsamic glaze", "rice vinegar", "wine vinegar"]),
  item("mirin", "pantry", "Mirin", "Mirin", "Mirin", ["mirin"]),
  item("sesame-oil", "pantry", "Huile de sésame", "Sesame oil", "Olio di sesamo", ["sesame oil"]),
  item("truffle-oil", "pantry", "Huile de truffe", "Truffle oil", "Olio al tartufo", ["truffle oil"]),
  item("truffle", "pantry", "Truffe noire", "Black truffle", "Tartufo nero", ["truffle", "black truffle"]),
  item("tamarind", "pantry", "Tamarin", "Tamarind", "Tamarindo", ["tamarind", "tamarind jam", "tamarind concentrate"]),
  item("curry-paste", "pantry", "Pâte de curry", "Curry paste", "Pasta di curry", ["curry paste", "green curry", "green curry paste", "paneng curry paste"]),
  item("capers", "pantry", "Câpres", "Capers", "Capperi", ["caper"]),
  item("harissa", "pantry", "Harissa", "Harissa", "Harissa", ["harissa"]),
  item("dashi", "pantry", "Dashi", "Dashi", "Dashi", ["dashi powder"]),
  item("white-wine", "pantry", "Vin blanc", "White wine", "Vino bianco", ["white wine", "sweet white wine", "dry white wine"]),
  item("red-wine", "pantry", "Vin rouge", "Red wine", "Vino rosso", ["red wine"]),
  item("champagne", "pantry", "Champagne", "Champagne", "Champagne", ["champagne"]),
  item("beer", "pantry", "Bière", "Beer", "Birra", ["beer", "lager"]),
  item("rum", "pantry", "Rhum", "Rum", "Rum", ["rum"]),
  item("grenadine", "pantry", "Sirop de grenadine", "Grenadine", "Granatina", ["grenadine"]),
  item("cognac", "pantry", "Cognac", "Cognac", "Cognac", ["cognac"]),
  item("port", "pantry", "Porto", "Port", "Porto", ["port", "port wine"]),
  item("almonds", "pantry", "Amandes", "Almonds", "Mandorle", ["almond", "almond flour"]),
  item("hazelnuts", "pantry", "Noisettes", "Hazelnuts", "Nocciole", ["hazelnut"]),
  item("walnuts", "pantry", "Noix", "Walnuts", "Noci", ["walnut"]),
  item("pistachios", "pantry", "Pistaches", "Pistachios", "Pistacchi", ["pistachio"]),
  item("pine-nuts", "pantry", "Pignons de pin", "Pine nuts", "Pinoli", ["pine nut"]),
  item("cashews", "pantry", "Noix de cajou", "Cashews", "Anacardi", ["cashew", "cashew nut"]),
  item("peanuts", "pantry", "Cacahuètes", "Peanuts", "Arachidi", ["peanut"]),
  item("sesame", "pantry", "Graines de sésame", "Sesame seeds", "Semi di sesamo", ["sesame", "sesame seed"]),
  item("sunflower-seeds", "pantry", "Graines de tournesol", "Sunflower seeds", "Semi di girasole", ["sunflower seed"]),

  // Spices
  item("cumin", "spices", "Cumin", "Cumin", "Cumino", ["cumin"]),
  item("paprika", "spices", "Paprika", "Paprika", "Paprika", ["paprika"]),
  item("turmeric", "spices", "Curcuma", "Turmeric", "Curcuma", ["turmeric"]),
  item("cinnamon", "spices", "Cannelle", "Cinnamon", "Cannella", ["cinnamon"]),
  item("nutmeg", "spices", "Noix de muscade", "Nutmeg", "Noce moscata", ["nutmeg"]),
  item("cloves", "spices", "Clous de girofle", "Cloves", "Chiodi di garofano", ["clove"]),
  item("saffron", "spices", "Safran", "Saffron", "Zafferano", ["saffron"]),
  item("curry-powder", "spices", "Curry en poudre", "Curry powder", "Curry in polvere", ["curry powder"]),
  item("masala", "spices", "Garam masala", "Garam masala", "Garam masala", ["garam masala", "biryani masala", "tandoori powder"]),
  item("couscous-spices", "spices", "Épices à couscous", "Couscous spice mix", "Spezie per couscous", ["couscous spice mix", "ras el hanout"]),
  item("ground-coriander", "spices", "Coriandre en poudre", "Ground coriander", "Coriandolo in polvere", ["ground coriander"]),
  item("fennel-seeds", "spices", "Fenouil en poudre", "Ground fennel", "Finocchio in polvere", ["ground fennel"]),
]

export const PANTRY_ITEMS_BY_ID = new Map(PANTRY_ITEMS.map((entry) => [entry.id, entry]))

export function pantryLabel(entry: PantryItem, language: string | undefined): string {
  const lang = (language ?? "en").slice(0, 2)
  return lang === "fr" || lang === "it" ? entry.label[lang] : entry.label.en
}

const STAPLE = "staple"

interface Pattern {
  id: string
  words: string[]
}

const words = (text: string) => normalize(text).split(" ").filter(Boolean).map(stem)

const PATTERNS: Pattern[] = [
  ...STAPLES.map((text) => ({ id: STAPLE, words: words(text) })),
  ...PANTRY_ITEMS.flatMap((entry) => entry.match.map((text) => ({ id: entry.id, words: words(text) }))),
].sort((a, b) => b.words.length - a.words.length)

/** Catalog ids found in one ingredient line ("staple" for salt, oil…), longest patterns first. */
export function matchIngredientLine(line: string): string[] {
  const tokens = words(line)
  const used = new Array<boolean>(tokens.length).fill(false)
  const found: { id: string; at: number }[] = []
  for (const pattern of PATTERNS) {
    const n = pattern.words.length
    for (let i = 0; i + n <= tokens.length; i++) {
      let ok = true
      for (let j = 0; j < n && ok; j++) ok = !used[i + j] && tokens[i + j] === pattern.words[j]
      if (!ok) continue
      for (let j = 0; j < n; j++) used[i + j] = true
      found.push({ id: pattern.id, at: i })
    }
  }
  return [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.id))]
}

/**
 * What a recipe needs, one entry per ingredient: a list of interchangeable catalog ids ("spaghetti
 * or rigatoni", "parmesan or gruyère"), or an empty list when the line is not recognised.
 * Lines satisfied by a staple (salt, pepper, oil, "butter or oil") are left out.
 */
export interface PantryNeed {
  items: string[]
  text: string
}

export function recipeNeeds(lines: string[]): PantryNeed[] {
  const needs: PantryNeed[] = []
  const seen = new Set<string>()
  const add = (items: string[], text: string) => {
    const key = items.join("|")
    if (items.length > 0 && seen.has(key)) return
    seen.add(key)
    needs.push({ items, text })
  }
  for (const line of lines) {
    const ids = matchIngredientLine(line)
    const alternatives = /\bor\b/i.test(line)
    if (ids.includes(STAPLE) && (alternatives || ids.length === 1)) continue
    const items = ids.filter((id) => id !== STAPLE)
    if (items.length === 0) add([], line)
    else if (alternatives) add(items, line)
    else items.forEach((id) => add([id], line))
  }
  return needs
}

export type PantryNeeds = Map<string, PantryNeed[]>

/** Reads documents.json (see scripts/build-search-index.mjs): ingredient lines joined with " · ". */
export function parsePantryDocuments(data: unknown): PantryNeeds {
  const needs: PantryNeeds = new Map()
  if (!Array.isArray(data)) return needs
  for (const entry of data) {
    const text = entry?.ingredients?.en
    if (typeof entry?.slug !== "string" || typeof text !== "string") continue
    needs.set(entry.slug, recipeNeeds(text.split(" · ").filter(Boolean)))
  }
  return needs
}

/** Catalog items used by at least one recipe, most used first. */
export function usedItems(needs: PantryNeeds): { item: PantryItem; count: number }[] {
  const counts = new Map<string, number>()
  for (const list of needs.values()) {
    for (const id of new Set(list.flatMap((need) => need.items))) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return PANTRY_ITEMS.flatMap((entry) => (counts.has(entry.id) ? [{ item: entry, count: counts.get(entry.id)! }] : [])).sort(
    (a, b) => b.count - a.count
  )
}

export interface PantryMatch {
  slug: string
  /** Ticked ingredients the recipe uses. */
  matched: string[]
  /** What is still needed (alternatives grouped). */
  missing: PantryNeed[]
  total: number
}

export type PantrySort = "matches" | "missing"

/**
 * Recipes using at least one ticked ingredient. "matches" ranks by the number of ticked
 * ingredients used, then by what is left to buy; "missing" puts the recipes closest to
 * complete first.
 */
export function rankByPantry(needs: PantryNeeds, have: Set<string>, sort: PantrySort = "matches"): PantryMatch[] {
  if (have.size === 0) return []
  const results: PantryMatch[] = []
  for (const [slug, list] of needs) {
    const matched = new Set<string>()
    const missing: PantryNeed[] = []
    for (const need of list) {
      const owned = need.items.filter((id) => have.has(id))
      if (owned.length > 0) owned.forEach((id) => matched.add(id))
      else missing.push(need)
    }
    if (matched.size > 0) results.push({ slug, matched: [...matched], missing, total: list.length })
  }
  const coverage = (r: PantryMatch) => (r.total - r.missing.length) / r.total
  return results.sort((a, b) =>
    sort === "matches"
      ? b.matched.length - a.matched.length || a.missing.length - b.missing.length || coverage(b) - coverage(a)
      : a.missing.length - b.missing.length || coverage(b) - coverage(a) || b.matched.length - a.matched.length
  )
}
