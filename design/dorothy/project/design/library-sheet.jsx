// Mobile Media Library — Bottom Sheet redesign.
// Replaces the left-edge drawer in MobileLibraryDrawer.tsx.
// Goals: thumb-reach actions, larger tap targets, clear hierarchy, prominent upload progress.
const S = window.SPOT;
const F = window.SPOT_FONT;

// — Backdrop: dimmed player so the user knows where they came from —
function PlayerBackdrop() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: S.bg, color: S.text, fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      filter: 'brightness(0.32)',
    }}>
      <div style={{ height: 44 }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico.DorothyMark size={22} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>Dorothy</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  );
}

// — Type tile (the icon next to each row) —
function TypeTile({ kind, active }) {
  const accent =
    kind === 'folder' ? S.text :
    kind === 'video'  ? '#A28DFF' :
    kind === 'lyrics' ? '#FFB75D' :
                        S.greenBright;
  const Icon =
    kind === 'folder' ? Ico.Folder :
    kind === 'video'  ? Ico.Film :
    kind === 'lyrics' ? Ico.FileText :
                        Ico.Music;

  return (
    <div style={{
      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
      background: S.surfaceHi,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: active ? S.greenBright : accent,
    }}>
      {active ? (
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 18 }}>
          <div style={{ width: 3, height: 11, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 18, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 8,  background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 14, background: S.greenBright, borderRadius: 1 }} />
        </div>
      ) : (
        <Icon size={20} />
      )}
    </div>
  );
}

// — Folder row —
function FolderRowL({ name, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 4px',
      cursor: 'pointer',
    }}>
      <TypeTile kind="folder" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: S.text, letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ fontSize: 12, color: S.textDim, marginTop: 2 }}>
          {count}개 항목
        </div>
      </div>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: S.textDim,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

// — Asset row —
function AssetRowL({ name, kind, size, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 4px',
      cursor: 'pointer',
    }}>
      <TypeTile kind={kind} active={active} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: active ? S.greenBright : S.text,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          fontSize: 12, color: S.textDim, marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{kind === 'video' ? '영상' : kind === 'lyrics' ? '가사' : '오디오'}</span>
          <span>·</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{size}</span>
        </div>
      </div>
      <button style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: S.textDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico.MoreH size={16} />
      </button>
    </div>
  );
}

// — Pending upload row —
function PendingRowL({ name, kind, phase, progress }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 4px',
      position: 'relative',
    }}>
      <TypeTile kind={kind} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: S.textMute,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ fontSize: 12, color: S.greenBright, marginTop: 4, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{phase}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{progress}%</span>
        </div>
        {/* Progress track */}
        <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: S.greenBright, borderRadius: 2,
            transition: 'width 0.2s',
          }} />
        </div>
      </div>
    </div>
  );
}

// — Breadcrumb chip row (scrollable on overflow) —
function BreadcrumbChips({ path }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 0',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
    }}>
      {path.map((crumb, i) => {
        const active = i === path.length - 1;
        return (
          <React.Fragment key={i}>
            <button style={{
              padding: '6px 12px', borderRadius: 999,
              background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
              border: 'none',
              color: active ? S.text : S.textMute,
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              {i === 0 && <Ico.Home size={13} />}
              {crumb}
            </button>
            {i < path.length - 1 && (
              <span style={{ color: S.textDim, fontSize: 13 }}>/</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// — Section label (e.g. "폴더", "파일") —
function SectionLabel({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0 6px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: S.textDim,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>{children}</div>
      {right && <div style={{ fontSize: 11, color: S.textDim }}>{right}</div>}
    </div>
  );
}

// — Bottom action bar (sticky) —
function ActionBar({ onCreate, onUpload, creating }) {
  if (creating) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 20px 16px',
        borderTop: `1px solid ${S.divider}`,
        background: S.surface,
      }}>
        <div style={{
          flex: 1, height: 44,
          background: S.surfaceHi2, borderRadius: 999,
          padding: '0 16px', display: 'flex', alignItems: 'center',
          color: S.text, fontSize: 14, fontWeight: 600,
          border: `1px solid ${S.greenBright}`,
        }}>
          새 폴더 이름
          <span style={{ width: 1, height: 18, background: S.text, marginLeft: 2, opacity: 0.7 }} />
        </div>
        <button style={{
          height: 44, padding: '0 18px', borderRadius: 999,
          background: S.greenBright, border: 'none', color: '#000',
          fontSize: 14, fontWeight: 800, cursor: 'pointer',
        }}>만들기</button>
      </div>
    );
  }
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10,
      padding: '12px 20px 22px',
      borderTop: `1px solid ${S.divider}`,
      background: S.surface,
    }}>
      <button style={{
        height: 48, borderRadius: 999,
        background: 'transparent', border: `1px solid rgba(255,255,255,0.22)`,
        color: S.text, fontSize: 14, fontWeight: 800, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <Ico.Plus size={16} /> 폴더
      </button>
      <button style={{
        height: 48, borderRadius: 999,
        background: S.greenBright, border: 'none', color: '#000',
        fontSize: 14, fontWeight: 800, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 4px 14px rgba(29,215,96,0.3)',
      }}>
        <Ico.Upload size={16} /> 업로드
      </button>
    </div>
  );
}

// — The sheet shell —
function Sheet({ children, height = 760 }) {
  return (
    <div style={{
      width: 390, height: 844,
      fontFamily: F.sans, position: 'relative', overflow: 'hidden',
      background: '#000',
    }}>
      <PlayerBackdrop />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height,
        background: S.surface,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        color: S.text,
      }}>
        {children}
      </div>
    </div>
  );
}

// — Sheet header (drag handle + title + storage badge + close) —
function SheetHeader() {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
      </div>
      <div style={{
        padding: '10px 20px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>내 미디어</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Storage as compact badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 6px 8px', borderRadius: 999,
            background: S.surfaceHi,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `conic-gradient(${S.greenBright} 0% 15%, ${S.surfaceHi2} 15% 100%)`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: S.textMute, fontFamily: 'ui-monospace, monospace' }}>
              312 MB <span style={{ color: S.textDim }}>/ 2.0 GB</span>
            </span>
          </div>
          <button style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: S.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico.X size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant 1 — Default (browsing a folder with content)
// ─────────────────────────────────────────────────────────────
function LibrarySheet() {
  return (
    <Sheet>
      <SheetHeader />

      {/* Breadcrumb */}
      <div style={{ padding: '4px 16px 0' }}>
        <BreadcrumbChips path={['홈', 'CCR']} />
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '4px 20px 12px',
      }}>
        {/* Pending uploads first — what user just dropped */}
        <SectionLabel right="2 / 5 완료">업로드 중</SectionLabel>
        <PendingRowL name="Down on the Corner.mp3" kind="audio" phase="업로드 중" progress={64} />
        <PendingRowL name="Susie Q live 1970.mp4" kind="video" phase="변환 중" progress={28} />

        <SectionLabel>폴더</SectionLabel>
        <FolderRowL name="80s rock" count={12} />
        <FolderRowL name="K-pop study" count={34} />

        <SectionLabel right="6">파일</SectionLabel>
        <AssetRowL name="Bad Moon Rising.mp3" kind="audio" size="5.2 MB" active />
        <AssetRowL name="Bad Moon Rising.lrc" kind="lyrics" size="3.1 KB" />
        <AssetRowL name="Have You Ever Seen the Rain.mp3" kind="audio" size="4.8 MB" />
        <AssetRowL name="Have You Ever Seen.lrc" kind="lyrics" size="2.8 KB" />
        <AssetRowL name="Fortunate Son.mp3" kind="audio" size="4.1 MB" />
        <AssetRowL name="Proud Mary.mp3" kind="audio" size="6.0 MB" />
      </div>

      <ActionBar />
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant 2 — Empty folder state with prominent drop affordance
// ─────────────────────────────────────────────────────────────
function LibrarySheetEmpty() {
  return (
    <Sheet>
      <SheetHeader />

      <div style={{ padding: '4px 16px 0' }}>
        <BreadcrumbChips path={['홈', '신규 폴더']} />
      </div>

      <div style={{
        flex: 1, minHeight: 0, padding: '12px 20px 12px',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Big drop zone */}
        <div style={{
          flex: 1,
          border: `2px dashed rgba(255,255,255,0.15)`,
          borderRadius: 16,
          background: 'rgba(255,255,255,0.025)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 14, textAlign: 'center', padding: '0 32px',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: S.greenSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: S.greenBright,
          }}>
            <Ico.Upload size={28} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: S.text }}>
              이 폴더는 비어 있어요
            </div>
            <div style={{ fontSize: 13, color: S.textMute, marginTop: 6, lineHeight: 1.5, maxWidth: 280 }}>
              여기에 파일을 드래그하거나, 아래 <span style={{ color: S.text, fontWeight: 700 }}>업로드</span> 버튼으로 추가하세요.
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
            marginTop: 4,
          }}>
            {['mp3', 'mp4', 'webm', 'mov', 'lrc', 'smi'].map((ext) => (
              <span key={ext} style={{
                padding: '3px 9px', borderRadius: 999,
                background: S.surfaceHi,
                fontSize: 10, fontWeight: 700,
                color: S.textMute, fontFamily: 'ui-monospace, monospace',
              }}>{ext}</span>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 14, padding: '12px 14px',
          background: S.surfaceHi, borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(29,185,84,0.16)', color: S.greenBright,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico.FileText size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.text }}>
              같은 이름의 .lrc / .smi 자막을 함께 올려보세요
            </div>
            <div style={{ fontSize: 11, color: S.textMute, marginTop: 1 }}>
              재생 시 자동으로 매칭돼 카라오케 가사가 표시됩니다.
            </div>
          </div>
        </div>
      </div>

      <ActionBar />
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant 3 — Creating a new folder (inline action bar morphs)
// ─────────────────────────────────────────────────────────────
function LibrarySheetCreating() {
  return (
    <Sheet>
      <SheetHeader />

      <div style={{ padding: '4px 16px 0' }}>
        <BreadcrumbChips path={['홈', 'CCR']} />
      </div>

      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '4px 20px 12px',
      }}>
        <SectionLabel>폴더</SectionLabel>
        {/* Ghost placeholder for the folder being created */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '10px 4px',
          opacity: 0.6,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 8, flexShrink: 0,
            background: S.surfaceHi,
            border: `1px dashed ${S.greenBright}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: S.greenBright,
          }}>
            <Ico.Folder size={20} />
          </div>
          <div style={{ flex: 1, fontSize: 14, color: S.textMute, fontStyle: 'italic' }}>
            새 폴더 만드는 중…
          </div>
        </div>

        <FolderRowL name="80s rock" count={12} />
        <FolderRowL name="K-pop study" count={34} />

        <SectionLabel right="6">파일</SectionLabel>
        <AssetRowL name="Bad Moon Rising.mp3" kind="audio" size="5.2 MB" active />
        <AssetRowL name="Bad Moon Rising.lrc" kind="lyrics" size="3.1 KB" />
        <AssetRowL name="Have You Ever Seen the Rain.mp3" kind="audio" size="4.8 MB" />
        <AssetRowL name="Fortunate Son.mp3" kind="audio" size="4.1 MB" />
        <AssetRowL name="Proud Mary.mp3" kind="audio" size="6.0 MB" />
      </div>

      <ActionBar creating />
    </Sheet>
  );
}

window.LibrarySheet = LibrarySheet;
window.LibrarySheetEmpty = LibrarySheetEmpty;
window.LibrarySheetCreating = LibrarySheetCreating;
