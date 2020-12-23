function widget:GetInfo()
    return {
        name         = "unitdefid_json",
        desc         = "Generate UnitDefID lookup .json file in enginefolder/debug/GAME.json",
        author       = "Jazcash",
        date         = "now",
        license      = "dicks",
        layer        = 0,
        enabled      = true
    }
end

function widget:Initialize()
    local result = {};
    for key, value in ipairs(UnitDefs) do
        table.insert(result, string.format("\"%s\":\"%s\"", key, value.name))
    end
    
    file = io.open ("debug/" .. Game.gameShortName .. ".json", "w");
    file:write("{" .. table.concat(result, ",") .. "}");
    file:close();

    Spring.Echo("Wrote UnitDefIDs to enginefolder/debug/" .. Game.gameShortName .. ".json")
end