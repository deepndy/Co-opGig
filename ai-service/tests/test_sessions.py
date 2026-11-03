from app.services.sessions import SessionStore


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_new_session_gets_an_id_and_is_reused():
    store = SessionStore(ttl_seconds=60)
    a = store.get_or_create(None)
    b = store.get_or_create(a.id)
    assert a is b
    assert len(store) == 1


def test_expired_sessions_are_deleted():
    clock = FakeClock()
    store = SessionStore(ttl_seconds=60, clock=clock)
    state = store.get_or_create(None)
    state.location = "Kothrud"
    clock.now += 61
    fresh = store.get_or_create(state.id)  # same id, but the old data is gone
    assert fresh.location is None
    assert len(store) == 1


def test_activity_keeps_a_session_alive():
    clock = FakeClock()
    store = SessionStore(ttl_seconds=60, clock=clock)
    state = store.get_or_create(None)
    state.location = "Baner"
    for _ in range(5):
        clock.now += 50
        assert store.get_or_create(state.id).location == "Baner"


def test_store_never_grows_past_the_limit():
    store = SessionStore(ttl_seconds=600, max_sessions=3)
    for _ in range(10):
        store.get_or_create(None)
    assert len(store) <= 3


def test_reset_removes_a_session():
    store = SessionStore(ttl_seconds=60)
    state = store.get_or_create(None)
    assert store.reset(state.id) is True
    assert store.reset(state.id) is False
    assert len(store) == 0
