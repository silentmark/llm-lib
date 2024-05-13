/*
 * Class that holds constants - not the API key?
 */
class llmSettings {
  static ID = "llm-lib";

  static SETTINGS = {
    API_KEY: "api_key",
    KEYS: "keys"
  };

  static TEMPLATES = {
    CHATBOT: `modules/${this.ID}/templates/llm-lib.hbs`,
  };


  /**
   * A small helper function which leverages developer mode flags to gate debug logs.
   *
   * @param {boolean} force - forces the log even if the debug flag is not on
   * @param  {...any} args - what to log
   */
  static log(force, ...args) {
    const shouldLog =
      force ||
      game.modules.get("_dev-mode")?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
      console.log(this.ID, "|", ...args);
    }
  }

  static initialize() {
    this.llmSettings = new llmSettings();

    game.settings.register(this.ID, this.SETTINGS.API_KEY, {
      name: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Name`,
      default: "",
      type: String,
      scope: "world", // or is it 'client'?
      config: true,
      restricted: true,
      hint: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Hint`,
      onChange: () => {}, // Probably don't need this if I can just grab it from game.settings.get. Instead in future this could be a way to let me know something has changed
    });
  }
}

/**
 * Register our module's debug flag with developer mode's custom hook
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(llm.ID);
});

/*
 *
 */

class llmLib {
    static careers = null;
    static talents = null;

    static async callLlm(llmQuery) {
        if (llmLib.careers === null) {
          this.careers = await game.wfrp4e.utility.findAll("career");
        }
        if (llmLib.talents === null) {
          this.talents = await game.wfrp4e.utility.findAll("talent");
        }

        const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`); // Replace with your actual API key
        const url = 'https://api.openai.com/v1/chat/completions';
        let messages = [
          { "role": "system", "content": llmLib.helpfulAssistant },
          {"role": "user", "content": llmQuery }
        ];

        let data = {
            model: "gpt-4-turbo-preview",
            response_format: { type: "json_object" },
            messages: messages
        };

        let actorData
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
                });
            
            const responseData = await response.json();
            actorData = responseData.choices[0].message.content;
            actorData = JSON.parse(actorData);
            messages.push({ "role": "assistant", "content": responseData.choices[0].message.content });
        } catch (error) {
            console.error('Error:', error);
            return null;
        }

        const careersMessage = `Dla wygenerowanego przed chwilą NPC, na podstawie wygenerowanego opisu i biografii, wybierz od jednej do czterech adekwatnych profesji spośród: ${this.careers.map(career => career.name).join(", ")}. Wybrane nazwy zwróć w formacie JSON. Nie zmieniaj wielkości liter. Nie zmieniaj formy żeńskiej na męską i odwrotnie.
        {
          "careers": []
        }
        `;
        messages.push({ "role": "user", "content": careersMessage });

        data = {
          model: "gpt-4-turbo-preview",
          response_format: { type: "json_object" },
          messages: messages
        };

        try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
          
          const responseData = await response.json();
          let careers = responseData.choices[0].message.content;
          careers = JSON.parse(careers);
          actorData.npc.careers = []; 
          for (let career of careers.careers) {
            let co = this.careers.find(c => c.name === career);
            if (!co) {
              co = this.careers.map(c => { return { name: c.name, uuid: c.uuid, index: this.levenshtein(c.name, career)}; }).sort((a, b) => a.index - b.index)[0];
            }
            actorData.npc.careers.push({name: co.name, uuid: co.uuid});
          }
          messages.push({ "role": "assistant", "content": responseData.choices[0].message.content });
        } catch (error) {
            console.error('Error:', error);
            return null;
        }

        
        const talentsMessage = `Dla wygenerowanego przed chwilą NPC, na podstawie wygenerowanego opisu i biografii oraz profesji, wybierz od czterech do ośmiu  adekwatnych talentów spośród: ${this.talents.map(talent => talent.name).join(", ")}. Wybrane nazwy zwróć w formacie JSON. Nie zmieniaj wielkości liter. Nie zmieniaj wartości ani nazw. Nie odmieniaj nazw talentów.
        {
          "talents": []
        }
        `;
        messages.push({ "role": "user", "content": talentsMessage });

        data = {
          model: "gpt-4-turbo-preview",
          response_format: { type: "json_object" },
          messages: messages
        };

        try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
          
          const responseData = await response.json();
          let talents = responseData.choices[0].message.content;
          talents = JSON.parse(talents);
          actorData.npc.talents = []; 
          for (let talent of talents.talents) {
            let co = this.talents.find(c => c.name === talent);
            if (!co) {
              co = this.talents.map(c => { return { name: c.name, uuid: c.uuid, index: this.levenshtein(c.name, talent)}; }).sort((a, b) => a.index - b.index)[0];
            }
            actorData.npc.talents.push({name: co.name, uuid: co.uuid});
          }
          messages.push({ "role": "assistant", "content": responseData.choices[0].message.content });
        } catch (error) {
            console.error('Error:', error);
            return null;
        }

        const dalleMessage = `Dla wygenerowanego przed chwilą NPC, na podstawie wygenerowanego opisu i biografii, przygotuj opis po angielsku na potrzeby generowania protretu. Opis powinien zaczynać się od "Photographic, realistic, fantasy genere. A portrait of". Wygenerowany opis zwróć w formacie JSON.
        {
          "dalle": []
        }
        `;
        messages.push({ "role": "user", "content": dalleMessage });

        data = {
          model: "gpt-4-turbo-preview",
          response_format: { type: "json_object" },
          messages: messages
        };

        try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
          
          const responseData = await response.json();
          let dalle = responseData.choices[0].message.content;
          dalle = JSON.parse(dalle);
          actorData.dalle = dalle.dalle;
          messages.push({ "role": "assistant", "content": responseData.choices[0].message.content });
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
        return actorData;
  }

  static async callDallE(llmQuery) {
      const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
      const url = 'https://api.openai.com/v1/images/generations';
  
      const data = {
          model: "dall-e-3", // Ensure this is the correct model identifier
          prompt: "A portrait of " + llmQuery,
          n: 1, // Number of images to generate
          size: "1024x1024", // Desired size of the image
          response_format: "b64_json"
      };
  
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
  
          const responseData = await response.json();
          console.log(responseData);
          return responseData.data[0].b64_json; // Adjust based on actual response
      } catch (error) {
          console.error('Error:', error);
          return null;
      }
  }

  static async callChat(messages) {
    const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
        const url = 'https://api.openai.com/v1/chat/completions';
    
        const data = {
            model: "gpt-4-turbo-preview",
            messages: [{ "role": "system", "content": 'Jesteś pomocnym i kreatywnym asystentem Mistrza Gry w 4. edycji Warhammer Fantasy RPG. Pomagasz, pisząc  dla Mistrza Gry historię i opisy postaci w języku polskim' }, ...messages]
        };
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            let message = responseData.choices[0].message.content;
            return message;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
  }

  static levenshtein(s, t) {
    if (s === t) {
        return 0;
    }
    var n = s.length, m = t.length;
    if (n === 0 || m === 0) {
        return n + m;
    }
    var x = 0, y, a, b, c, d, g, h, k;
    var p = new Array(n);
    for (y = 0; y < n;) {
        p[y] = ++y;
    }

    for (; (x + 3) < m; x += 4) {
        var e1 = t.charCodeAt(x);
        var e2 = t.charCodeAt(x + 1);
        var e3 = t.charCodeAt(x + 2);
        var e4 = t.charCodeAt(x + 3);
        c = x;
        b = x + 1;
        d = x + 2;
        g = x + 3;
        h = x + 4;
        for (y = 0; y < n; y++) {
            k = s.charCodeAt(y);
            a = p[y];
            if (a < c || b < c) {
                c = (a > b ? b + 1 : a + 1);
            }
            else {
                if (e1 !== k) {
                    c++;
                }
            }

            if (c < b || d < b) {
                b = (c > d ? d + 1 : c + 1);
            }
            else {
                if (e2 !== k) {
                    b++;
                }
            }

            if (b < d || g < d) {
                d = (b > g ? g + 1 : b + 1);
            }
            else {
                if (e3 !== k) {
                    d++;
                }
            }

            if (d < g || h < g) {
                g = (d > h ? h + 1 : d + 1);
            }
            else {
                if (e4 !== k) {
                    g++;
                }
            }
            p[y] = h = g;
            g = d;
            d = b;
            b = c;
            c = a;
        }
    }

    for (; x < m;) {
        var e = t.charCodeAt(x);
        c = x;
        d = ++x;
        for (y = 0; y < n; y++) {
            a = p[y];
            if (a < c || d < c) {
                d = (a > d ? d + 1 : a + 1);
            }
            else {
                if (e !== s.charCodeAt(y)) {
                    d = c + 1;
                }
                else {
                    d = c;
                }
            }
            p[y] = d;
            c = a;
        }
        h = d;
    }

    return h;
}

  static callPredetermined() {
    return this.elara;
  }

  static callPredeterminedImg() {
    return this.b64;
  }

  static helpfulAssistant = `
 Jesteś pomocnym i kreatywnym asystentem Mistrza Gry w 4. edycji Warhammer Fantasy RPG. Pomagasz, podając opisy i podstawowe cechy dla NPC w określonym formacie JSON. Wyjście będzie zawierać serię cech bohatera niezależnego, opis wyglądu, opis charakteru, od jednej do trzech interesujących cech, biografię z trzema znaczącymi wydarzeniami w życi postaci (nie bój się dodać więcej) oraz wszelkie powiązania lub relacje z rodziną, przyjaciółmi lub wrogami. Wypiszesz tylko wymagane atrybuty w języku polskim, bez zbędnych dodatków. Używaj systemu metrycznego. JSON wypełnij wartościami w języku polskim. pola characteristics wypełnij wartościami liczbowymi od 1 do 100.
{
  "npc": {
    "name": "",
    "type": "npc",
    "system": {
      "characteristics": {
        "weaponSkill": { "value": "" },
        "ballisticSkill": { "value": "" },
        "strength": { "value": "" },
        "toughness": { "value": "" },
        "initiative": { "value": "" },
        "agility": { "value": "" },
        "dexterity": { "value": "" },
        "intelligence": { "value": "" },
        "willPower": { "value": "" },
        "fellowship": { "value": "" }
      },
      "details": {
        "biography": { "value": "" },
        "description": { "value": "" },
        "species": { "value": "" },
        "gender": { "value": "" },
        "age": { "value": "" },
        "height": { "value": "" },
        "weight": { "value": "" },
        "hair": { "value": "" },
        "eyes": { "value": "" },
      }
    }
  }
}
`;
}
// Initialize llmSettings
Hooks.once("init", () => {
  llmSettings.initialize();
});

// Example of a GET request using fetch in FoundryVTT
fetch("http://json.schemastore.org/launchsettings.json")
  .then((response) => {
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log("Data fetched:", data);
    // Handle the data here
  })
  .catch((error) => {
    console.error("Fetch error:", error);
  });
