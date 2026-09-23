from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Account, Domain, Email, Identity, Phone
from app.schemas.dashboard import (
    CorrelationAlert,
    IdentityOpsecScore,
    OpsecFactor,
    SecurityAlert,
    SecurityDashboard,
    SecurityOverview)
from app.security.crypto import decrypt

OLD_PASSWORD_THRESHOLD = timedelta(days=365)
WEAK_PASSWORD_MIN_LENGTH = 10
COMMON_WEAK_PASSWORDS = {"password", "123456", "azerty", "qwerty", "letmein", "motdepasse", '12345678', '1234', 'pussy', '12345', 'dragon', 'qwerty', '696969', 'mustang', 'letmein', 'baseball', 'master', 'michael', 'football', 'shadow', 'monkey', 'abc123', 'pass', 'fuckme', '6969', 'jordan', 'harley', 'ranger', 'iwantu', 'jennifer', 'hunter', 'fuck', '2000', 'test', 'batman', 'trustno1', 'thomas', 'tigger', 'robert', 'access', 'love', 'buster', '1234567', 'soccer', 'hockey', 'killer', 'george', 'sexy', 'andrew', 'charlie', 'superman', 'asshole', 'fuckyou', 'dallas', 'jessica', 'panties', 'pepper', '1111', 'austin', 'william', 'daniel', 'golfer', 'summer', 'heather', 'hammer', 'yankees', 'joshua', 'maggie', 'biteme', 'enter', 'ashley', 'thunder', 'cowboy', 'silver', 'richard', 'fucker', 'orange', 'merlin', 'michelle', 'corvette', 'bigdog', 'cheese', 'matthew', '121212', 'patrick', 'martin', 'freedom', 'ginger', 'blowjob', 'nicole', 'sparky', 'yellow', 'camaro', 'secret', 'dick', 'falcon', 'taylor', '111111', '131313', '123123', 'bitch', 'hello', 'scooter', 'please', 'porsche', 'guitar', 'chelsea', 'black', 'diamond', 'nascar', 'jackson', 'cameron', '654321', 'computer', 'amanda', 'wizard', 'xxxxxxxx', 'money', 'phoenix', 'mickey', 'bailey', 'knight', 'iceman', 'tigers', 'purple', 'andrea', 'horny', 'dakota', 'aaaaaa', 'player', 'sunshine', 'morgan', 'starwars', 'boomer', 'cowboys', 'edward', 'charles', 'girls', 'booboo', 'coffee', 'xxxxxx', 'bulldog', 'ncc1701', 'rabbit', 'peanut', 'john', 'johnny', 'gandalf', 'spanky', 'winter', 'brandy', 'compaq', 'carlos', 'tennis', 'james', 'mike', 'brandon', 'fender', 'anthony', 'blowme', 'ferrari', 'cookie', 'chicken', 'maverick', 'chicago', 'joseph', 'diablo', 'sexsex', 'hardcore', '666666', 'willie', 'welcome', 'chris', 'panther', 'yamaha', 'justin', 'banana', 'driver', 'marine', 'angels', 'fishing', 'david', 'maddog', 'hooters', 'wilson', 'butthead', 'dennis', 'fucking', 'captain', 'bigdick', 'chester', 'smokey', 'xavier', 'steven', 'viking', 'snoopy', 'blue', 'eagles', 'winner', 'samantha', 'house', 'miller', 'flower', 'jack', 'firebird', 'butter', 'united', 'turtle', 'steelers', 'tiffany', 'zxcvbn', 'tomcat', 'golf', 'bond007', 'bear', 'tiger', 'doctor', 'gateway', 'gators', 'angel', 'junior', 'thx1138', 'porno', 'badboy', 'debbie', 'spider', 'melissa', 'booger', '1212', 'flyers', 'fish', 'porn', 'matrix', 'teens', 'scooby', 'jason', 'walter', 'cumshot', 'boston', 'braves', 'yankee', 'lover', 'barney', 'victor', 'tucker', 'princess', 'mercedes', '5150', 'doggie', 'zzzzzz', 'gunner', 'horney', 'bubba', '2112', 'fred', 'johnson', 'xxxxx', 'tits', 'member', 'boobs', 'donald', 'bigdaddy', 'bronco', 'penis', 'voyager', 'rangers', 'birdie', 'trouble', 'white', 'topgun', 'bigtits', 'bitches', 'green', 'super', 'qazwsx', 'magic', 'lakers', 'rachel', 'slayer', 'scott', '2222', 'asdf', 'video', 'london', '7777', 'marlboro', 'srinivas', 'internet', 'action', 
                         'carter', 'jasper', 'monster', 'teresa', 'jeremy', '11111111', 'bill', 'crystal', 'peter', 'pussies', 'cock', 'beer', 'rocket', 'theman', 'oliver', 'prince', 'beach', 'amateur', '7777777', 'muffin', 'redsox', 'star', 'testing', 'shannon', 'murphy', 'frank', 'hannah', 'dave', 'eagle1', '11111', 'mother', 'nathan', 'raiders', 'steve', 'forever', 'angela', 'viper', 'ou812', 'jake', 'lovers', 'suckit', 'gregory', 'buddy', 'whatever', 'young', 'nicholas', 'lucky', 'helpme', 'jackie', 'monica', 'midnight', 'college', 'baby', 'cunt', 'brian', 'mark', 'startrek', 'sierra', 'leather', '232323', '4444', 'beavis', 'bigcock', 'happy', 'sophie', 'ladies', 'naughty', 'giants', 'booty', 
                         'blonde', 'fucked', 'golden', '0', 'fire', 'sandra', 'pookie', 'packers', 'einstein', 'dolphins', 'chevy', 'winston', 'warrior', 'sammy', 'slut', '8675309', 'zxcvbnm', 'nipples', 'power', 'victoria', 'asdfgh', 'vagina', 
                         'toyota', 'travis', 'hotdog', 'paris', 'rock', 'xxxx', 'extreme', 'redskins', 'erotic', 'dirty', 'ford', 'freddy', 'arsenal', 'access14', 'wolf', 'nipple', 'iloveyou', 'alex', 'florida', 'eric', 'legend', 'movie', 'success', 'rosebud', 'jaguar', 'great', 'cool', 'cooper', '1313', 'scorpio', 'mountain', 'madison', '987654', 'brazil', 'lauren', 'japan', 'naked', 'squirt', 'stars', 'apple', 'alexis', 'aaaa', 'bonnie', 'peaches', 'jasmine', 'kevin', 'matt', 'qwertyui', 'danielle', 'beaver', '4321', '4128', 'runner', 'swimming', 'dolphin', 'gordon', 'casper', 'stupid', 'shit', 'saturn', 'gemini', 'apples', 'august', '3333', 'canada', 'blazer', 'cumming', 'hunting', 'kitty', 'rainbow', '112233', 'arthur', 'cream', 'calvin', 'shaved', 'surfer', 'samson', 'kelly', 'paul', 'mine', 'king', 'racing', '5555', 'eagle', 'hentai', 'newyork', 'little', 'redwings', 'smith', 'sticky', 'cocacola', 'animal', 'broncos', 'private', 'skippy', 'marvin', 'blondes', 'enjoy', 'girl', 'apollo', 'parker', 'qwert', 'time', 'sydney', 'women', 'voodoo', 'magnum', 'juice', 'abgrtyu', '777777', 
                         'dreams', 'maxwell', 'music', 'rush2112', 'russia', 'scorpion', 'rebecca', 'tester', 'mistress', 'phantom', 'billy', '6666', 'albert', '123456', 'password', '12345678', '1234', 'pussy', '12345', 'dragon', 'qwerty', '696969', 'mustang', 'letmein', 'baseball', 'master', 'michael', 'football', 'shadow', 'monkey', 'abc123', 'pass', 'fuckme', '6969', 'jordan', 'harley', 'ranger', 'iwantu', 'jennifer', 'hunter', 'fuck', '2000', 'test', 'batman', 'trustno1', 'thomas', 'tigger', 'robert', 'access', 'love', 'buster', '1234567', 'soccer', 'hockey', 'killer', 'george', 'sexy', 'andrew', 'charlie', 'superman', 'asshole', 'fuckyou', 'dallas', 'jessica', 'panties', 'pepper', '1111', 'austin', 'william', 'daniel', 'golfer', 'summer', 'heather', 'hammer', 'yankees', 'joshua', 'maggie', 'biteme', 'enter', 'ashley', 'thunder', 'cowboy', 'silver', 'richard', 'fucker', 'orange', 'merlin', 'michelle', 'corvette', 'bigdog', 'cheese', 'matthew', '121212', 'patrick', 'martin', 'freedom', 'ginger', 'blowjob', 'nicole', 'sparky', 'yellow', 'camaro', 'secret', 'dick', 'falcon', 'taylor', '111111', '131313', '123123', 'bitch', 'hello', 'scooter', 'please', 'porsche', 'guitar', 'chelsea', 'black', 'diamond', 'nascar', 'jackson', 'cameron', '654321', 'computer', 'amanda', 'wizard', 'xxxxxxxx', 'money', 'phoenix', 'mickey', 'bailey', 'knight', 'iceman', 'tigers', 'purple', 'andrea', 'horny', 'dakota', 'aaaaaa', 'player', 'sunshine', 'morgan', 'starwars', 'boomer', 'cowboys', 'edward', 'charles', 'girls', 'booboo', 'coffee', 'xxxxxx', 'bulldog', 'ncc1701', 'rabbit', 'peanut', 'john', 'johnny', 'gandalf', 'spanky', 'winter', 'brandy', 'compaq', 'carlos', 'tennis', 'james', 'mike', 'brandon', 'fender', 'anthony', 'blowme', 'ferrari', 'cookie', 'chicken', 'maverick', 'chicago', 'joseph', 'diablo', 'sexsex', 'hardcore', '666666', 'willie', 'welcome', 'chris', 'panther', 'yamaha', 'justin', 'banana', 'driver', 'marine', 'angels', 'fishing', 'david', 'maddog', 'hooters', 'wilson', 'butthead', 'dennis', 'fucking', 'captain', 'bigdick', 'chester', 'smokey', 'xavier', 'steven', 'viking', 'snoopy', 'blue', 'eagles', 
                         'winner', 'samantha', 'house', 'miller', 'flower', 'jack', 'firebird', 'butter', 'united', 'turtle', 'steelers', 'tiffany', 'zxcvbn', 'tomcat', 'golf', 'bond007', 'bear', 'tiger', 'doctor', 'gateway', 'gators', 'angel', 'junior', 'thx1138', 'porno', 'badboy', 'debbie', 'spider', 'melissa', 'booger', '1212', 'flyers', 'fish', 'porn', 'matrix', 'teens', 'scooby', 'jason', 'walter', 
                         'cumshot', 'boston', 'braves', 'yankee', 'lover', 'barney', 'victor', 'tucker', 'princess', 'mercedes', '5150', 'doggie', 'zzzzzz', 'gunner', 'horney', 'bubba', '2112', 'fred', 'johnson', 'xxxxx', 'tits', 'member', 'boobs', 'donald', 'bigdaddy', 'bronco', 'penis', 'voyager', 'rangers', 'birdie', 'trouble', 'white', 'topgun', 'bigtits', 'bitches', 'green', 'super', 'qazwsx', 'magic', 'lakers', 'rachel', 'slayer', 'scott', '2222', 'asdf', 'video', 
                         'london', '7777', 'marlboro', 'srinivas', 'internet', 'action', 'carter', 'jasper', 'monster', 'teresa', 'jeremy', '11111111', 'bill', 'crystal', 'peter', 'pussies', 'cock', 'beer', 'rocket', 'theman', 'oliver', 'prince', 'beach', 'amateur', '7777777', 'muffin', 'redsox', 'star', 'testing', 'shannon', 'murphy', 'frank', 'hannah', 'dave', 'eagle1', '11111', 'mother', 'nathan', 'raiders', 'steve', 'forever', 'angela', 'viper', 'ou812', 'jake', 'lovers', 'suckit', 'gregory', 'buddy', 'whatever', 'young', 'nicholas', 'lucky', 'helpme', 'jackie', 'monica', 'midnight', 'college', 'baby', 'cunt', 'brian', 'mark', 'startrek', 'sierra', 'leather', '232323', 
                         '4444', 'beavis', 'bigcock', 'happy', 'sophie', 'ladies', 'naughty', 'giants', 'booty', 'blonde', 'fucked', 'golden', '0', 'fire', 'sandra', 'pookie', 'packers', 'einstein', 'dolphins', 'chevy', 'winston', 'warrior', 'sammy', 'slut', '8675309', 'zxcvbnm', 'nipples', 'power', 'victoria', 'asdfgh', 'vagina', 'toyota', 'travis', 'hotdog', 'paris', 'rock', 'xxxx', 'extreme', 'redskins', 'erotic', 'dirty', 'ford', 'freddy', 'arsenal', 'access14', 'wolf', 'nipple', 'iloveyou', 'alex', 'florida', 'eric', 'legend', 'movie', 'success', 'rosebud', 'jaguar', 'great', 'cool', 'cooper', '1313', 'scorpio', 'mountain', 'madison', '987654', 'brazil', 'lauren', 'japan', 'naked', 'squirt', 'stars', 'apple', 'alexis', 'aaaa', 'bonnie', 'peaches', 'jasmine', 'kevin', 'matt', 'qwertyui', 'danielle', 'beaver', '4321', '4128', 'runner', 'swimming', 'dolphin', 'gordon', 'casper', 'stupid', 'shit', 'saturn', 'gemini', 'apples', 'august', '3333', 'canada', 'blazer', 'cumming', 'hunting', 'kitty', 'rainbow', '112233', 'arthur', 'cream', 'calvin', 'shaved', 'surfer', 'samson', 'kelly', 'paul', 'mine', 'king', 'racing', '5555', 'eagle', 'hentai', 'newyork', 'little', 'redwings', 'smith', 'sticky', 'cocacola', 'animal', 'broncos', 'private', 'skippy', 'marvin', 'blondes', 'enjoy', 'girl', 'apollo', 'parker', 'qwert', 'time', 'sydney', 'women', 'voodoo', 'magnum', 
                         'juice', 'abgrtyu', '777777', 'dreams', 'maxwell', 'music', 'rush2112', 'russia', 'scorpion', 'rebecca', 'tester', 'mistress', 'phantom', 'billy', '6666', 'albert', '123456', 'password', '12345678', '1234', 'pussy', '12345', 'dragon', 'qwerty', '696969', 'mustang', 'letmein', 'baseball', 'master', 'michael', 'football', 'shadow', 'monkey', 'abc123', 'pass', 'fuckme', '6969', 'jordan', 'harley', 'ranger', 'iwantu', 'jennifer', 'hunter', 'fuck', '2000', 'test', 'batman', 'trustno1', 'thomas', 'tigger', 'robert', 'access', 'love', 'buster', '1234567', 'soccer', 'hockey', 'killer', 'george', 'sexy', 'andrew', 'charlie', 'superman', 'asshole', 'fuckyou', 'dallas', 'jessica', 'panties', 'pepper', '1111', 'austin', 'william', 'daniel', 'golfer', 'summer', 'heather', 'hammer', 'yankees', 'joshua', 'maggie', 'biteme', 'enter', 'ashley', 'thunder', 'cowboy', 'silver', 'richard', 'fucker', 'orange', 'merlin', 'michelle', 'corvette', 'bigdog', 'cheese', 'matthew', '121212', 'patrick', 'martin', 'freedom', 'ginger', 'blowjob', 'nicole', 'sparky', 'yellow', 'camaro', 'secret', 'dick', 'falcon', 'taylor', '111111', '131313', '123123', 'bitch', 'hello', 'scooter', 'please', 'porsche', 'guitar', 'chelsea', 'black', 'diamond', 'nascar', 'jackson', 'cameron', '654321', 'computer', 'amanda', 'wizard', 'xxxxxxxx', 'money', 'phoenix', 'mickey', 'bailey', 'knight', 'iceman', 'tigers', 'purple', 'andrea', 'horny', 'dakota', 'aaaaaa', 'player', 'sunshine', 'morgan', 'starwars', 'boomer', 'cowboys', 'edward', 'charles', 'girls', 'booboo', 'coffee', 'xxxxxx', 'bulldog', 'ncc1701', 'rabbit', 'peanut', 'john', 'johnny', 'gandalf', 'spanky', 'winter', 'brandy', 'compaq', 'carlos', 'tennis', 'james', 'mike', 'brandon', 'fender', 'anthony', 'blowme', 'ferrari', 'cookie', 'chicken', 'maverick', 'chicago', 'joseph', 'diablo', 'sexsex', 'hardcore', '666666', 'willie', 'welcome', 'chris', 'panther', 'yamaha', 'justin', 'banana', 'driver', 'marine', 'angels', 'fishing', 'david', 'maddog', 'hooters', 'wilson', 'butthead', 'dennis', 'fucking', 'captain', 'bigdick', 'chester', 'smokey', 'xavier', 'steven', 'viking', 'snoopy', 'blue', 'eagles', 'winner', 'samantha', 'house', 'miller', 'flower', 'jack', 'firebird', 'butter', 'united', 'turtle', 'steelers', 'tiffany', 'zxcvbn', 'tomcat', 'golf', 'bond007', 
                         'bear', 'tiger', 'doctor', 'gateway', 'gators', 'angel', 'junior', 'thx1138', 'porno', 'badboy', 'debbie', 'spider', 'melissa', 'booger', '1212', 'flyers', 
                         'fish', 'porn', 'matrix', 'teens', 'scooby', 'jason', 'walter', 'cumshot', 'boston', 'braves', 'yankee', 'lover', 'barney', 'victor', 'tucker', 'princess', 'mercedes', 
                         '5150', 'doggie', 'zzzzzz', 'gunner', 'horney', 'bubba', '2112', 'fred', 'johnson', 'xxxxx', 'tits', 'member', 'boobs', 'donald', 'bigdaddy', 'bronco', 'penis', 'voyager', 'rangers', 'birdie', 'trouble', 'white', 'topgun', 'bigtits', 'bitches', 'green', 'super', 'qazwsx', 'magic', 'lakers', 'rachel', 'slayer', 'scott', '2222', 'asdf', 'video', 'london', '7777', 'marlboro', 'srinivas', 'internet', 'action', 'carter', 'jasper', 'monster', 'teresa', 'jeremy', '11111111', 'bill', 'crystal', 'peter', 'pussies', 'cock', 'beer', 'rocket', 'theman', 'oliver', 'prince', 'beach', 'amateur', '7777777', 'muffin', 'redsox', 'star', 'testing', 'shannon', 'murphy', 'frank', 'hannah', 'dave', 'eagle1', '11111', 'mother', 'nathan', 'raiders', 'steve', 'forever', 'angela', 'viper', 'ou812', 'jake', 'lovers', 'suckit', 'gregory', 'buddy', 'whatever', 'young', 'nicholas', 'lucky', 'helpme', 'jackie', 'monica', 'midnight', 'college', 'baby', 'cunt', 'brian', 'mark', 'startrek', 'sierra', 'leather', '232323', '4444', 'beavis', 'bigcock', 'happy', 'sophie', 'ladies', 'naughty', 'giants', 'booty', 'blonde', 'fucked', 'golden', '0', 'fire', 'sandra', 'pookie', 'packers', 'einstein', 'dolphins', 'chevy', 'winston', 'warrior', 'sammy', 'slut', '8675309', 'zxcvbnm', 'nipples', 'power', 'victoria', 'asdfgh', 'vagina', 'toyota', 'travis', 'hotdog', 'paris', 'rock', 'xxxx', 'extreme', 'redskins', 'erotic', 'dirty', 'ford', 'freddy', 'arsenal', 'access14', 'wolf', 'nipple', 'iloveyou', 'alex', 'florida', 'eric', 'legend', 'movie', 'success', 'rosebud', 'jaguar', 'great', 'cool', 'cooper', '1313', 'scorpio', 'mountain', 'madison', '987654', 'brazil', 'lauren', 'japan', 'naked', 'squirt', 'stars', 'apple', 'alexis', 'aaaa', 'bonnie', 'peaches', 'jasmine', 'kevin', 'matt', 'qwertyui', 'danielle', 'beaver', '4321', '4128', 'runner', 'swimming', 'dolphin', 'gordon', 'casper', 'stupid', 'shit', 'saturn', 'gemini', 'apples', 'august', '3333', 'canada', 'blazer', 'cumming', 'hunting', 'kitty', 'rainbow', '112233', 'arthur', 'cream', 'calvin', 'shaved', 'surfer', 'samson', 'kelly', 'paul', 'mine', 'king', 'racing', '5555', 'eagle', 'hentai', 'newyork', 'little', 'redwings', 'smith', 'sticky', 'cocacola', 'animal', 'broncos', 'private', 'skippy', 'marvin', 'blondes', 'enjoy', 'girl', 'apollo', 'parker', 'qwert', 'time', 'sydney', 'women', 'voodoo', 'magnum', 'juice', 'abgrtyu', '777777', 'dreams', 'maxwell', 'music', 'rush2112', 'russia', 'scorpion', 'rebecca', 'tester', 'mistress', 'phantom', 'billy', '6666', 'albert'}


def _is_weak(password: str) -> bool:
    return len(password) < WEAK_PASSWORD_MIN_LENGTH or password.lower() in COMMON_WEAK_PASSWORDS


def _is_old(last_change: datetime | None) -> bool:
    if last_change is None:
        return False
    now = datetime.now(timezone.utc)
    if last_change.tzinfo is None:
        last_change = last_change.replace(tzinfo=timezone.utc)
    return now - last_change > OLD_PASSWORD_THRESHOLD


def _decrypt_account_passwords(accounts: list[Account], dek: bytes) -> dict[str, str]:
    passwords: dict[str, str] = {}
    for account in accounts:
        if account.password_ciphertext is None:
            continue
        plaintext = decrypt(account.password_nonce, account.password_ciphertext, dek)
        passwords[account.id] = plaintext.decode("utf-8")
    return passwords


def _find_reused_account_ids(passwords: dict[str, str]) -> set[str]:
    by_value: dict[str, list[str]] = {}
    for account_id, value in passwords.items():
        by_value.setdefault(value, []).append(account_id)
    reused: set[str] = set()
    for account_ids in by_value.values():
        if len(account_ids) > 1:
            reused.update(account_ids)
    return reused


def _collect_identity_fields(db: Session, dek: bytes) -> dict[str, set[tuple[str, str]]]:
    """Pour chaque identité, l'ensemble des (type_de_champ, valeur_normalisée)
    qu'elle utilise  (emails, téléphones, domaines déchiffrés au besoin)."""
    fields_by_identity: dict[str, set[tuple[str, str]]] = {}

    for email in db.query(Email).all():
        if email.is_sensitive:
            if email.address_ciphertext is None:
                continue
            value = decrypt(email.address_nonce, email.address_ciphertext, dek).decode("utf-8")
        else:
            value = email.address or ""
        if not value:
            continue
        fields_by_identity.setdefault(email.identity_id, set()).add(("email", value.strip().lower()))

    for phone in db.query(Phone).all():
        value = decrypt(phone.number_nonce, phone.number_ciphertext, dek).decode("utf-8")
        fields_by_identity.setdefault(phone.identity_id, set()).add(("phone", value.strip()))

    for domain in db.query(Domain).all():
        fields_by_identity.setdefault(domain.identity_id, set()).add(
            ("domain", domain.domain_name.strip().lower()))

    return fields_by_identity


def _find_correlations(
    identities: list[Identity], fields_by_identity: dict[str, set[tuple[str, str]]]) -> list[CorrelationAlert]:
    correlations: list[CorrelationAlert] = []
    for i, identity_a in enumerate(identities):
        fields_a = fields_by_identity.get(identity_a.id, set())
        if not fields_a:
            continue
        for identity_b in identities[i + 1 :]:
            fields_b = fields_by_identity.get(identity_b.id, set())
            shared = fields_a & fields_b
            if shared:
                correlations.append(
                    CorrelationAlert(
                        identity_a_id=identity_a.id,
                        identity_a_name=identity_a.name,
                        identity_b_id=identity_b.id,
                        identity_b_name=identity_b.name,
                        shared_fields=sorted({field_type for field_type, _ in shared}),
                    )
                )
    return correlations


def build_security_dashboard(db: Session, dek: bytes) -> SecurityDashboard:
    identities = db.query(Identity).all()
    accounts = db.query(Account).all()
    identities_by_id = {i.id: i for i in identities}

    passwords = _decrypt_account_passwords(accounts, dek)
    reused_ids = _find_reused_account_ids(passwords)
    weak_ids = {aid for aid, pw in passwords.items() if _is_weak(pw)}
    old_ids = {a.id for a in accounts if _is_old(a.last_password_change)}

    two_fa_enabled = sum(1 for a in accounts if a.has_2fa)

    overview = SecurityOverview(
        identities_count=len(identities),
        accounts_count=len(accounts),
        passwords_count=len(passwords),
        two_fa_enabled_count=two_fa_enabled,
        two_fa_total_count=len(accounts),
        weak_passwords_count=len(weak_ids),
        reused_passwords_count=len(reused_ids),
        old_passwords_count=len(old_ids),
    )

    alerts: list[SecurityAlert] = []
    for account in accounts:
        identity = identities_by_id.get(account.identity_id)
        identity_name = identity.name if identity else None

        if account.id in weak_ids:
            alerts.append(SecurityAlert(
                severity="critical", identity_id=account.identity_id, identity_name=identity_name,
                account_id=account.id, service_name=account.service_name,
                message="Mot de passe faible",
            ))
        if account.id in reused_ids:
            alerts.append(SecurityAlert(
                severity="critical", identity_id=account.identity_id, identity_name=identity_name,
                account_id=account.id, service_name=account.service_name,
                message="Mot de passe réutilisé sur plusieurs comptes",
            ))
        if account.id in old_ids:
            alerts.append(SecurityAlert(
                severity="warning", identity_id=account.identity_id, identity_name=identity_name,
                account_id=account.id, service_name=account.service_name,
                message="Mot de passe non changé depuis plus de 12 mois",
            ))
        if not account.has_2fa:
            alerts.append(SecurityAlert(
                severity="warning", identity_id=account.identity_id, identity_name=identity_name,
                account_id=account.id, service_name=account.service_name,
                message="2FA désactivée",
            ))

    fields_by_identity = _collect_identity_fields(db, dek)
    correlations = _find_correlations(identities, fields_by_identity)
    for corr in correlations:
        fields_label = ", ".join(corr.shared_fields)
        alerts.append(SecurityAlert(
            severity="warning", identity_id=corr.identity_a_id, identity_name=corr.identity_a_name,
            account_id=None, service_name=None,
            message=f"Partage {fields_label} avec {corr.identity_b_name}",
        ))

    accounts_by_identity: dict[str, list[Account]] = {}
    for account in accounts:
        accounts_by_identity.setdefault(account.identity_id, []).append(account)

    correlation_count_by_identity: dict[str, int] = {}
    for corr in correlations:
        correlation_count_by_identity[corr.identity_a_id] = correlation_count_by_identity.get(corr.identity_a_id, 0) + 1
        correlation_count_by_identity[corr.identity_b_id] = correlation_count_by_identity.get(corr.identity_b_id, 0) + 1

    scores: list[IdentityOpsecScore] = []
    for identity in identities:
        identity_accounts = accounts_by_identity.get(identity.id, [])
        weak_count = sum(1 for a in identity_accounts if a.id in weak_ids)
        reused_count = sum(1 for a in identity_accounts if a.id in reused_ids)
        old_count = sum(1 for a in identity_accounts if a.id in old_ids)
        no_2fa_count = sum(1 for a in identity_accounts if not a.has_2fa)
        corr_count = correlation_count_by_identity.get(identity.id, 0)

        factors: list[OpsecFactor] = []
        score = 100

        if weak_count:
            pts = -15 * weak_count
            score += pts
            factors.append(OpsecFactor(label=f"{weak_count} mot(s) de passe faible(s)", points=pts))
        if reused_count:
            pts = -15 * reused_count
            score += pts
            factors.append(OpsecFactor(label=f"{reused_count} mot(s) de passe réutilisé(s)", points=pts))
        if old_count:
            pts = -10 * old_count
            score += pts
            factors.append(OpsecFactor(label=f"{old_count} mot(s) de passe ancien(s) (>12 mois)", points=pts))
        if no_2fa_count:
            pts = -10 * no_2fa_count
            score += pts
            factors.append(OpsecFactor(label=f"{no_2fa_count} compte(s) sans 2FA", points=pts))
        if corr_count:
            pts = -20 * corr_count
            score += pts
            factors.append(OpsecFactor(label=f"{corr_count} corrélation(s) avec une autre identité", points=pts))

        score = max(0, min(100, score))
        scores.append(IdentityOpsecScore(identity_id=identity.id, identity_name=identity.name, score=score, factors=factors))

    return SecurityDashboard(overview=overview, alerts=alerts, scores=scores, correlations=correlations)



