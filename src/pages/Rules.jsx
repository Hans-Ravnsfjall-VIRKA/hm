const LOCK_TEXT = 'Tippa allar dystirnar í einum umfari áðrenn fyrsti dysturin verður bríkslaður í gongd. Tá fyrsti dystur í umfarinum byrjar, verður umfarið læst og tað ber ikki til at skráseta nýggjar dystir. Tó ber til at tillaga tipping á einkultum dystum upp til 1 tíma áðrenn kick-off, treytað av at hesir vóru tippaðir áðrenn umfarið bleiv læst';

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
              <tr><td className="pp">0</td><td>Skeivt úrslit (skeivur vinnari ella skeivur javnleikur).</td></tr>
              <tr><td className="pp">3</td><td>Rætt úrslit: rættur vinnari, ella rættur javnleikur.</td></tr>
              <tr><td className="pp">4</td><td>Rætt úrslit og mál hjá einum liðinum eru rætt.</td></tr>
              <tr><td className="pp">6</td><td>Rætt úrslit: bæði tøl eru rætt.</td></tr>
              <tr><td className="pp">+1</td><td>Fyri hvørt mál meir enn 4 í einum rættum úrsliti.</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 10 }}>
            Dømi: rætt 3-2 (5 mál tilsamans) gevur 7 stig. Rætt 4-2 gevur 8 stig. Rætt 2-2 gevur 6 stig.
            Bonusstigini galda bert, tá úrslitið er rætt.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="rule-sec">
          <h2>Tipping og læsing</h2>
          <p>Tú mást tippa allar dystir í einum umfari áðrenn fyrsti dysturin byrjar. Tá fyrsti dysturin byrjar, læsir umfarið, og tú kanst ikki skráseta nýggjar dystir.</p>
          <p>Tá ið tú hevur tippað øll úrslitini í umfarinum, kanst tú tillaga einstakar dystir framm til ein tíma áðrenn dysturin byrjar.</p>
          <div className="lock-note" style={{ marginTop: 10 }}>{LOCK_TEXT}</div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="rule-sec">
          <h2>Nýggj umfør</h2>
          <p>Tá bólkaspælið er liðugt, koma dystirnir næstu fasu sjálvvirkandi inn, so skjótt tað er avgjørt hvørji lið koma víðari. Tað sama hendir fyri hvørt knockout-umfar.</p>
        </div>
      </div>

      <div className="panel">
        <div className="rule-sec">
          <h2>Livescore</h2>
          <p>Úrslitini koma frá ESPN. Støðan í dystum verður dagførd automatiskt, vanliga 10. hvønn minutt. Skipanin dagførir sjálv, so skjótt ein nýggj støða er innlisin. Stig og støða verða roknað beinleiðis út frá støðuni tú sært í skipanini, so tað altíð er í samsvari við tað tú sært á skíggjanum.</p>
        </div>
      </div>
    </>
  );
}
