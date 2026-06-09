const LOCK_TEXT = 'Lás allar dystirnar í einum umfari áðrenn fyrsti dysturin verður bríkslaður í gongd. Tá fyrsti dystur í umfarinum byrjar, verður umfarið læst og tað ber ikki til at skráseta nýggjar dystir. Tó ber til at tillaga tipping á einkultum dystum upp til 1 tíma áðrenn kick-off, treytað av at hesir vóru tippaðir áðrenn umfarið bleiv læst';

export default function Rules() {
  return (
    <>
      <div className="page-head">
        <h1>Reglur</h1>
        <p>Soleiðis riggar tippikappingin.</p>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="rule-sec">
          <h2>Stig</h2>
          <p>Hvør dystur gevur stig eftir hesum:</p>
          <table className="scoretbl">
            <tbody>
              <tr><td className="pp">0</td><td>Skeivt úrslit (skeivur vinnari ella skeiv javnteflisgáta).</td></tr>
              <tr><td className="pp">3</td><td>Rætt úrslit: rættur vinnari, ella rætt javntefli.</td></tr>
              <tr><td className="pp">4</td><td>Rætt úrslit og mál hjá einum liðinum eru rætt.</td></tr>
              <tr><td className="pp">6</td><td>Neyvt úrslit: bæði tøl eru rætt.</td></tr>
              <tr><td className="pp">+1</td><td>Fyri hvørt mál meir enn 4 í einum neyvum úrsliti.</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 10 }}>
            Dømi: neyvt 3-2 (5 mál tilsamans) gevur 7 stig. Neyvt 4-2 gevur 8 stig. Neyvt 2-2 gevur 6 stig.
            Bonusstigini galda bert, tá heila úrslitið er neyvt.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="rule-sec">
          <h2>Tipping og læsing</h2>
          <p>Tú mást tippa allar dystir í einum umfari áðrenn fyrsti dysturin byrjar. Tá fyrsti dysturin byrjar, læsir umfarið, og tú kanst ikki skráseta nýggjar dystir.</p>
          <p>Hevur tú longu tippað øll úrslitini í umfarinum, kanst tú tó tillaga einstakar dystir heilt til 1 tíma áðrenn teir byrja. Ein tími áðrenn ein dystur byrjar, læsir tann dysturin.</p>
          <div className="lock-note" style={{ marginTop: 10 }}>{LOCK_TEXT}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="rule-sec">
          <h2>Nýggj umfør</h2>
          <p>Tá bólkaspælið er liðugt, koma dystirnir í 32-liða-úrslitinum sjálvvirkandi fram, so skjótt liðini eru greið. Tað sama hendir fyri hvørt knockout-umfar.</p>
        </div>
      </div>

      <div className="panel">
        <div className="rule-sec">
          <h2>Livescore</h2>
          <p>Úrslitini koma frá ESPN. Støðan í dystum verður dagførd automatiskt, vanliga hvørja 10. minutt. Telefonin hjá tær dagførir seg sjálv, so skjótt eitt nýtt úrslit er innlisið, tí appin lesur beint úr dátugrunninum.</p>
          <p>Stig og støða verða roknað beinleiðis í telefonini út frá úrslitunum, so tey eru altíð í samsvari við tað, sum tú sært á skíggjanum.</p>
        </div>
      </div>
    </>
  );
}
